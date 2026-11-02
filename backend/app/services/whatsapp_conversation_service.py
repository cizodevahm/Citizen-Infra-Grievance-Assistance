"""One durable draft per business phone and sender; the caller owns the transaction."""
import math
import re
from datetime import datetime, timezone
from uuid import uuid4

from psycopg.types.json import Jsonb

from ..config import Config
from . import whatsapp_service as transport
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
    # No media or AI work in the chat worker. The processing worker joins these
    # inputs to the photo findings once both are ready.
    draft.update(description=description, voice=voice,
                 acknowledgement_event_id=event["id"],
                 reply_message_at=event["message_at"].isoformat())
    # Also covers drafts which were already at location/description during rollout.
    if not draft.get("photo_queued"):
        _queue_photo(conn, event, draft)
    _save(conn, event, "processing", draft)
    return transport.text("Thank you for submitting. We are processing your complaint now.")


def _queue_photo(conn, event, draft):
    conn.execute(
        """insert into whatsapp_processing_jobs
           (submission_id, phone_number_id, sender_id, image_id, message_at)
           values (%s,%s,%s,%s,%s) on conflict (submission_id) do nothing""",
        (draft["submission_id"], event["phone_number_id"], event["sender_id"],
         draft["image_id"], event["message_at"]),
    )


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
        draft.update(image_id=media["id"], caption=media.get("caption", ""))
        _queue_photo(conn, event, draft)
        draft["photo_queued"] = True
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
    if step == "processing":
        return transport.text("Your complaint is still being reviewed. I’ll send the result when it is ready.")
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
