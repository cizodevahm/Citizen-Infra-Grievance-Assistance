"""Postgres inbox/outbox with ordered, locked processing and bounded retries."""
import logging
import re
from datetime import datetime, timedelta, timezone

import httpx
import psycopg
from botocore.exceptions import BotoCoreError, ClientError
from openai import APIConnectionError, APIStatusError
from psycopg.types.json import Jsonb

from .. import extensions as ext
from ..config import Config
from ..errors import AppError, ValidationError
from . import whatsapp_conversation_service as conversations
from . import whatsapp_service as transport

logger = logging.getLogger(__name__)
# A safety margin before Meta's 24-hour customer service window closes.
RESPONSE_WINDOW = timedelta(hours=23)


def _string(value, maximum, *, numeric=False):
    if (not isinstance(value, str) or not value or len(value) > maximum or "\x00" in value
            or (numeric and not re.fullmatch(r"[0-9]+", value))):
        raise ValidationError("Invalid WhatsApp message metadata.")
    return value


def _message(message, phone_number_id):
    if not isinstance(message, dict):
        raise ValidationError("Invalid WhatsApp message.")
    sender = _string(message.get("from"), 32, numeric=True)
    message_id = _string(message.get("id"), 512)
    timestamp = _string(message.get("timestamp"), 12, numeric=True)
    try:
        message_at = datetime.fromtimestamp(int(timestamp), timezone.utc)
    except (ValueError, OverflowError, OSError):
        raise ValidationError("Invalid WhatsApp message timestamp.") from None
    if message_at > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ValidationError("Invalid WhatsApp message timestamp.")
    kind = _string(message.get("type"), 64)
    clean = {"type": kind}
    if kind == "text":
        body = message.get("text")
        if not isinstance(body, dict):
            raise ValidationError("Invalid WhatsApp text message.")
        clean["text"] = {"body": _string(body.get("body"), 4096)}
    elif kind in ("image", "audio"):
        media = message.get(kind)
        if not isinstance(media, dict):
            raise ValidationError("Invalid WhatsApp media message.")
        clean[kind] = {"id": _string(media.get("id"), 64, numeric=True),
                       "mime_type": _string(media.get("mime_type"), 128)}
        if kind == "image" and "caption" in media:
            caption = media["caption"]
            if not isinstance(caption, str) or len(caption) > 4096 or "\x00" in caption:
                raise ValidationError("Invalid WhatsApp image caption.")
            clean[kind]["caption"] = caption
    elif kind == "location":
        location = message.get("location")
        if not isinstance(location, dict):
            raise ValidationError("Invalid WhatsApp location message.")
        # Invalid coordinates are handled with a repeated location request by the worker.
        clean[kind] = {key: location.get(key) for key in ("latitude", "longitude")}
    elif kind == "interactive":
        interactive = message.get(kind)
        if not isinstance(interactive, dict):
            raise ValidationError("Invalid WhatsApp interactive message.")
        reply = interactive.get("button_reply")
        if interactive.get("type") == "button_reply" and isinstance(reply, dict):
            clean[kind] = {"button_reply": {"id": _string(reply.get("id"), 256)}}
    elif kind == "button":
        button = message.get(kind)
        if not isinstance(button, dict):
            raise ValidationError("Invalid WhatsApp button message.")
        clean[kind] = {"payload": _string(button.get("payload"), 256)}
    return {"phone_number_id": phone_number_id, "sender_id": sender, "message_id": message_id,
            "message": clean, "message_at": message_at}


def parse_webhook(payload):
    if not isinstance(payload, dict) or payload.get("object") != "whatsapp_business_account":
        raise ValidationError("Invalid WhatsApp webhook object.")
    entries = payload.get("entry")
    if not isinstance(entries, list):
        raise ValidationError("Invalid WhatsApp webhook entries.")
    events = []
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValidationError("Invalid WhatsApp webhook entry.")
        if Config.WHATSAPP_BUSINESS_ACCOUNT_ID and entry.get("id") != Config.WHATSAPP_BUSINESS_ACCOUNT_ID:
            logger.warning("WhatsApp webhook skipped: WABA ID mismatch; check WHATSAPP_BUSINESS_ACCOUNT_ID against Meta API Setup")
            continue
        changes = entry.get("changes")
        if not isinstance(changes, list):
            raise ValidationError("Invalid WhatsApp webhook changes.")
        for change in changes:
            if not isinstance(change, dict):
                raise ValidationError("Invalid WhatsApp webhook change.")
            if change.get("field") != "messages":
                continue
            value = change.get("value")
            if not isinstance(value, dict):
                raise ValidationError("Invalid WhatsApp webhook value.")
            metadata = value.get("metadata")
            if not isinstance(metadata, dict) or metadata.get("phone_number_id") != Config.WHATSAPP_PHONE_NUMBER_ID:
                logger.warning("WhatsApp webhook skipped: Phone Number ID mismatch; check WHATSAPP_PHONE_NUMBER_ID against Meta API Setup")
                continue
            messages = value.get("messages", [])
            if not isinstance(messages, list):
                raise ValidationError("Invalid WhatsApp webhook messages.")
            # Delivery/read statuses are acknowledged without queue or conversation writes.
            events.extend(_message(message, Config.WHATSAPP_PHONE_NUMBER_ID) for message in messages)
    return sorted(events, key=lambda event: event["message_at"])


def enqueue(events):
    if not events:
        return
    with ext.db_pool.connection() as conn:
        # Serialize inbox inserts for a sender so a later ID cannot become visible
        # while an earlier delivery is still uncommitted. Workers do not take these
        # short ingress locks, so AI processing never holds up webhook persistence.
        for phone, sender in sorted({(event["phone_number_id"], event["sender_id"]) for event in events}):
            conn.execute("select pg_advisory_xact_lock(%s, hashtext(%s))", (7_424_002, f"{phone}:{sender}"))
        for event in events:
            conn.execute(
                """insert into whatsapp_events (phone_number_id, sender_id, message_id, message, message_at)
                   values (%s,%s,%s,%s,%s) on conflict (phone_number_id, message_id) do nothing""",
                (event["phone_number_id"], event["sender_id"], event["message_id"],
                 Jsonb(event["message"]), event["message_at"]),
            )


def _reply(conn, event, payload):
    conn.execute(
        """insert into whatsapp_outbox (event_id, phone_number_id, sender_id, payload, expires_at)
           values (%s,%s,%s,%s,%s) on conflict (event_id) do nothing""",
        (event["id"], event["phone_number_id"], event["sender_id"], Jsonb(payload),
         event["message_at"] + RESPONSE_WINDOW),
    )


def _failure(error):
    """Return only safe diagnostic categories; never serialize exceptions or API bodies."""
    if isinstance(error, transport.WhatsAppError):
        return error.transient, error.code
    if isinstance(error, APIStatusError):
        return error.status_code in (408, 429) or error.status_code >= 500, f"ai_http_{error.status_code}"
    if isinstance(error, (APIConnectionError, httpx.RequestError)):
        return True, "upstream_transport"
    if isinstance(error, ClientError):
        status = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode", 0)
        return status in (408, 429) or status >= 500, "storage_error"
    if isinstance(error, BotoCoreError):
        return True, "storage_transport"
    if isinstance(error, AppError):
        return error.status >= 500, "complaint_processing"
    if isinstance(error, psycopg.Error):
        return not isinstance(error, (psycopg.ProgrammingError, psycopg.IntegrityError)), "database_error"
    return True, "unexpected_processing_error"


def _backoff(attempt):
    return min(300, 2 ** min(attempt, 8))


def process_event():
    with ext.db_pool.connection() as conn:
        # Later messages remain blocked even while an earlier message is in retry backoff.
        # Locks survive through the entire transaction; a crashed worker rolls back safely.
        event = conn.execute(
            """select e.* from whatsapp_events e
               where e.status='pending' and e.next_attempt_at<=now() and e.phone_number_id=%s
                 and not exists (select 1 from whatsapp_events earlier
                     where earlier.phone_number_id=e.phone_number_id and earlier.sender_id=e.sender_id
                       and earlier.status='pending' and earlier.id<e.id)
               order by e.id for update of e skip locked limit 1""",
            (Config.WHATSAPP_PHONE_NUMBER_ID,),
        ).fetchone()
        if not event:
            return False
        stale = conn.execute(
            """select 1 from whatsapp_events where phone_number_id=%s and sender_id=%s
               and status='done' and message_at>%s limit 1""",
            (event["phone_number_id"], event["sender_id"], event["message_at"]),
        ).fetchone()
        if stale or event["message_at"] + RESPONSE_WINDOW <= datetime.now(timezone.utc):
            conn.execute("update whatsapp_events set status='expired', last_error='stale_event' where id=%s", (event["id"],))
            logger.info("WhatsApp event expired; event_id=%s", event["id"])
            return True
        attempt = event["attempts"] + 1
        try:
            with conn.transaction():  # savepoint: errors roll back all complaint/draft work
                if attempt > Config.WHATSAPP_MAX_ATTEMPTS:
                    raise transport.WhatsAppError("attempts_exhausted")
                payload = conversations.process(conn, event)
                _reply(conn, event, payload)
                conn.execute("update whatsapp_events set status='done', attempts=%s, last_error=null where id=%s",
                             (attempt, event["id"]))
        except Exception as error:
            transient, code = _failure(error)
            retry = transient and attempt < Config.WHATSAPP_MAX_ATTEMPTS
            conn.execute(
                """update whatsapp_events set status=%s, attempts=%s, last_error=%s,
                   next_attempt_at=clock_timestamp() + make_interval(secs => %s) where id=%s""",
                ("pending" if retry else "failed", attempt, code, _backoff(attempt), event["id"]),
            )
            if not retry:
                conversations.clear(conn, event)
                _reply(conn, event, transport.menu(
                    "We could not finish processing this request. It was not submitted. "
                    "Please choose New complaint to try again, or Track complaint to check an existing ticket."
                ))
            logger.warning("WhatsApp event %s; event_id=%s category=%s attempt=%s",
                           "retry scheduled" if retry else "failed", event["id"], code, attempt)
        return True


def send_outbox():
    with ext.db_pool.connection() as conn:
        row = conn.execute(
            """select o.* from whatsapp_outbox o
               where o.status='pending' and o.next_attempt_at<=now() and o.phone_number_id=%s
                 and not exists (select 1 from whatsapp_outbox earlier
                     where earlier.phone_number_id=o.phone_number_id and earlier.sender_id=o.sender_id
                       and earlier.status='pending' and earlier.id<o.id)
               order by o.id for update of o skip locked limit 1""",
            (Config.WHATSAPP_PHONE_NUMBER_ID,),
        ).fetchone()
        if not row:
            return False
        if row["expires_at"] <= datetime.now(timezone.utc):
            conn.execute("update whatsapp_outbox set status='expired', last_error='window_closed' where id=%s", (row["id"],))
            logger.info("WhatsApp reply expired; outbox_id=%s", row["id"])
            return True
        attempt = row["attempts"] + 1
        try:
            if attempt > Config.WHATSAPP_MAX_ATTEMPTS:
                raise transport.WhatsAppError("attempts_exhausted")
            message_id = transport.send_message(row["phone_number_id"], row["sender_id"], row["payload"])
        except Exception as error:
            transient, code = _failure(error)
            retry = transient and attempt < Config.WHATSAPP_MAX_ATTEMPTS
            conn.execute(
                """update whatsapp_outbox set status=%s, attempts=%s, last_error=%s,
                   next_attempt_at=clock_timestamp() + make_interval(secs => %s) where id=%s""",
                ("pending" if retry else "failed", attempt, code, _backoff(attempt), row["id"]),
            )
            logger.warning("WhatsApp reply %s; outbox_id=%s category=%s attempt=%s",
                           "retry scheduled" if retry else "failed", row["id"], code, attempt)
        else:
            # A crash after Meta accepts but before this commit can repeat a reply.
            # It cannot rerun complaint creation: the inbox transaction is already done.
            conn.execute(
                "update whatsapp_outbox set status='sent', attempts=%s, meta_message_id=%s, last_error=null where id=%s",
                (attempt, message_id, row["id"]),
            )
        return True
