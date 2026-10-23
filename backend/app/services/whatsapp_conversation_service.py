"""One durable draft per business phone and sender; the caller owns the transaction."""
import math
import re
from datetime import datetime, timezone
from uuid import uuid4

from psycopg.types.json import Jsonb

from ..config import Config
from ..errors import RejectedError, ValidationError
from . import ai_service, complaint_service, whatsapp_service as transport
from .tracking import normalize_tracking_id

_TRACKING = re.compile(r"RIF-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}")
_MENU = {"hi", "hello", "start", "menu", "cancel"}
_NEW = {"register", "new complaint", "new_complaint", "1"}
_TRACK = {"track", "track complaint", "track_complaint", "2"}
_PHOTO_PROMPT = (
    "Please send a clear picture of the infrastructure issue you would like to report."
)


def _save(conn, event, step, draft):
    conn.execute(
        """update whatsapp_conversations set step=%s, draft=%s,
           expires_at=now() + make_interval(secs => %s), updated_at=now()
           where phone_number_id=%s and sender_id=%s""",
        (step, Jsonb(draft), Config.WHATSAPP_CONVERSATION_TTL_SECONDS,
         event["phone_number_id"], event["sender_id"]),
    )


def clear(conn, event):
    _save(conn, event, "idle", {})


def _conversation(conn, event):
    conn.execute(
        """insert into whatsapp_conversations (phone_number_id, sender_id) values (%s,%s)
           on conflict (phone_number_id, sender_id) do nothing""",
        (event["phone_number_id"], event["sender_id"]),
    )
    return conn.execute(
        "select * from whatsapp_conversations where phone_number_id=%s and sender_id=%s for update",
        (event["phone_number_id"], event["sender_id"]),
    ).fetchone()


def _input(message):
    if message["type"] == "text":
        return message["text"]["body"].strip()
    if message["type"] == "interactive":
        return message.get("interactive", {}).get("button_reply", {}).get("id", "").strip()
    if message["type"] == "button":
        return message.get("button", {}).get("payload", "").strip()
    return ""


def _track(conn, event, tracking_id):
    # Ownership is part of the query, never an after-the-fact filter of public details.
    row = conn.execute(
        """select c.tracking_id, case when c.deleted_at is not null then 'deleted' else c.status end as status,
                  c.department, c.summary
           from whatsapp_complaints w join complaints c on c.id=w.complaint_id
           where w.phone_number_id=%s and w.sender_id=%s and c.tracking_id=%s""",
        (event["phone_number_id"], event["sender_id"], normalize_tracking_id(tracking_id)),
    ).fetchone()
    clear(conn, event)
    if not row:
        return transport.menu("No complaint belonging to you was found with that tracking ID.")
    return transport.menu(
        f"Tracking ID: {row['tracking_id']}\nStatus: {row['status']}\n"
        f"Department: {row['department']}\nSummary: {row['summary'][:650]}"
    )


def _result(row):
    return transport.menu(
        f"Complaint submitted.\nTracking ID: {row['tracking_id']}\nStatus: {row['status']}\n"
        "Use Track complaint to check progress."
    )


def _submit(conn, event, draft, description=None, voice=None):
    # The conversation row is locked. A committed submission is reused on any replay.
    existing = conn.execute(
        """select c.tracking_id, c.status from whatsapp_complaints w
           join complaints c on c.id=w.complaint_id
           where w.submission_id=%s and w.phone_number_id=%s and w.sender_id=%s""",
        (draft["submission_id"], event["phone_number_id"], event["sender_id"]),
    ).fetchone()
    if existing:
        clear(conn, event)
        return _result(existing)
    image, _, _ = transport.download_media(draft["image_id"], "image")
    audio = transport.download_media(voice["id"], "audio") if voice else None
    text = "\n".join(part for part in (draft.get("caption"), description) if part)
    try:
        result = complaint_service.submit(image, audio, text, draft["lat"], draft["lng"], db_conn=conn)
    except RejectedError as error:
        clear(conn, event)
        return transport.menu(f"Complaint not accepted: {error.message[:800]}\nChoose New complaint to try again.")
    # Keep the web submission response unchanged; find the ID inside this same transaction.
    complaint = conn.execute("select id from complaints where tracking_id=%s", (result["tracking_id"],)).fetchone()
    conn.execute(
        """insert into whatsapp_complaints (submission_id, phone_number_id, sender_id, complaint_id)
           values (%s,%s,%s,%s)""",
        (draft["submission_id"], event["phone_number_id"], event["sender_id"], complaint["id"]),
    )
    clear(conn, event)
    return _result(result)


def process(conn, event):
    conversation = _conversation(conn, event)
    message = event["message"]
    step, draft = conversation["step"], dict(conversation["draft"])
    if step == "confirm":
        clear(conn, event)
        return transport.menu("Your previous draft needs to be restarted. Choose New complaint to begin again.")
    expired = step != "idle" and conversation["expires_at"] <= datetime.now(timezone.utc)
    if expired:
        clear(conn, event)
        step, draft = "idle", {}

    value = _input(message)
    command = " ".join(value.lower().split())
    if command in _MENU:
        clear(conn, event)
        return transport.menu("Draft cancelled. Choose an option:" if command == "cancel" else "Choose an option:")
    if command in _NEW:
        _save(conn, event, "photo", {"submission_id": str(uuid4())})
        return transport.text(_PHOTO_PROMPT)
    if command in _TRACK:
        _save(conn, event, "track", {})
        return transport.text("Send your tracking ID, for example RIF-ABC234. Send Menu to return.")
    if command.startswith("track "):
        tracking_id = normalize_tracking_id(value.split(None, 1)[1])
        if _TRACKING.fullmatch(tracking_id):
            return _track(conn, event, tracking_id)
        _save(conn, event, "track", {})
        return transport.text("Send a valid tracking ID, for example RIF-ABC234, or Menu.")
    if expired:
        return transport.menu("Your draft expired and was not submitted. Choose New complaint to start again.")
    if step == "idle":
        if _TRACKING.fullmatch(normalize_tracking_id(value)):
            return _track(conn, event, value)
        return transport.menu()
    if step == "track":
        if _TRACKING.fullmatch(normalize_tracking_id(value)):
            return _track(conn, event, value)
        return transport.text("Send a valid tracking ID, for example RIF-ABC234, or Menu.")
    if step == "photo":
        media = message.get("image", {})
        if message["type"] != "image" or transport.mime_type(media.get("mime_type")) not in transport.IMAGE_TYPES:
            return transport.text(_PHOTO_PROMPT)
        try:
            image, _, _ = transport.download_media(media["id"], "image")
            ai_service.prepare_image(image)
        except ValidationError:
            return transport.text("That photo could not be read. " + _PHOTO_PROMPT)
        except transport.WhatsAppError as error:
            if error.transient:
                raise
            return transport.text("That photo could not be downloaded or is unsupported. " + _PHOTO_PROMPT)
        draft.update(image_id=media["id"], caption=media.get("caption", ""))
        _save(conn, event, "location", draft)
        return transport.location_request()
    if step == "location":
        location = message.get("location", {})
        try:
            lat, lng = location["latitude"], location["longitude"]
            if isinstance(lat, bool) or isinstance(lng, bool):
                raise ValueError
            lat, lng = float(lat), float(lng)
            if not math.isfinite(lat) or not math.isfinite(lng) or not -90 <= lat <= 90 or not -180 <= lng <= 180:
                raise ValueError
        except (KeyError, TypeError, ValueError, OverflowError):
            return transport.location_request()
        draft.update(lat=lat, lng=lng)
        _save(conn, event, "description", draft)
        return transport.description_request()
    if step == "description":
        if command == "skip":
            return _submit(conn, event, draft)
        if message["type"] == "text" and value:
            return _submit(conn, event, draft, description=value)
        audio = message.get("audio", {})
        if message["type"] == "audio" and transport.mime_type(audio.get("mime_type")) in transport.AUDIO_TYPES:
            return _submit(conn, event, draft, voice=audio)
        return transport.description_request()
    clear(conn, event)
    return transport.menu("Please choose New complaint to start again.")
