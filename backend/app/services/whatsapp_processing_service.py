"""Durable photo and final-assessment jobs, independent of the chat worker.

Only the job is locked during network calls. The conversation is locked briefly
at completion to reject obsolete work and commit the complaint and reply together.
"""
import logging
from datetime import datetime, timezone

from psycopg.types.json import Jsonb

from .. import extensions as ext
from ..config import Config
from . import ai_service, complaint_service, storage_service
from . import whatsapp_conversation_service as conversations
from . import whatsapp_queue as queue
from . import whatsapp_service as transport

logger = logging.getLogger(__name__)


def _current(conn, job, *, lock=False):
    row = conn.execute(
        "select step, draft, expires_at from whatsapp_conversations "
        "where phone_number_id=%s and sender_id=%s" + (" for update" if lock else ""),
        (job["phone_number_id"], job["sender_id"]),
    ).fetchone()
    if (not row or row["draft"].get("submission_id") != str(job["submission_id"])
            or row["expires_at"] <= datetime.now(timezone.utc)
            or row["step"] not in ("location", "description", "processing")):
        return None
    return row


def _terminal(conn, job, stage):
    # Release temporary media after completion, failure, cancellation or expiry.
    conn.execute(
        "update whatsapp_processing_jobs set stage=%s, image_bytes=null, findings=null, "
        "updated_at=now() where submission_id=%s", (stage, job["submission_id"]),
    )


def _reply(conn, job, draft, payload):
    message_at = datetime.fromisoformat(draft["reply_message_at"]) if draft.get("reply_message_at") else job["message_at"]
    conn.execute(
        """insert into whatsapp_outbox (submission_id, phone_number_id, sender_id, payload, expires_at)
           values (%s,%s,%s,%s,%s) on conflict (submission_id) do nothing""",
        (job["submission_id"], job["phone_number_id"], job["sender_id"], Jsonb(payload),
         message_at + queue.RESPONSE_WINDOW),
    )


def _acknowledgement_sent(conn, draft):
    event_id = draft.get("acknowledgement_event_id")
    if event_id is None:
        # Drafts already queued before this release did not record the link.
        return True
    row = conn.execute(
        "select status from whatsapp_outbox where event_id=%s", (event_id,),
    ).fetchone()
    return bool(row and row["status"] == "sent")


def _finalise(conn, job, draft):
    # Do not let a quick assessment overtake a missing or retrying acknowledgement.
    # 'sent' means Meta accepted the request, not a device delivery receipt.
    if not _acknowledgement_sent(conn, draft):
        return
    jpeg = bytes(job["image_bytes"])
    audio = transport.download_media(draft["voice"]["id"], "audio") if draft.get("voice") else None
    transcript = ai_service.transcribe(*audio) if audio else None
    raw_text = "\n".join(p for p in (draft.get("caption"), draft.get("description")) if p)
    combined = "\n".join(p for p in (raw_text, transcript) if p)
    ai = ai_service.triage_findings(job["findings"], combined, jpeg)
    accepted = ai["valid"] and ai["category"] != "none"
    image_url = audio_url = None
    if accepted:
        image_url = storage_service.upload(jpeg, "jpg", "image/jpeg")
        if audio:
            data, filename, mimetype = audio
            audio_url = storage_service.upload(data, storage_service.audio_extension(filename, mimetype), mimetype)

    # The citizen may have cancelled/restarted during transcription or AI processing.
    current = _current(conn, job, lock=True)
    if not current or current["step"] != "processing":
        _terminal(conn, job, "cancelled")
        return
    existing = conn.execute(
        """select c.tracking_id, c.status from whatsapp_complaints w
           join complaints c on c.id=w.complaint_id where w.submission_id=%s""",
        (job["submission_id"],),
    ).fetchone()
    if existing:
        payload = conversations._result(existing)
    elif not accepted:
        complaint_service._log_rejection(ai, raw_text, draft["lat"], draft["lng"], db_conn=conn)
        reason = ai.get("rejection_reason") or "The evidence does not establish an infrastructure problem."
        payload = transport.menu(f"Complaint not accepted: {reason[:800]}\nChoose New complaint to try again.")
    else:
        result = complaint_service.create_complaint(
            ai, draft["lat"], draft["lng"], raw_text, transcript, combined,
            image_url, audio_url, db_conn=conn,
        )
        complaint = conn.execute("select id from complaints where tracking_id=%s", (result["tracking_id"],)).fetchone()
        conn.execute(
            """insert into whatsapp_complaints (submission_id, phone_number_id, sender_id, complaint_id)
               values (%s,%s,%s,%s)""",
            (job["submission_id"], job["phone_number_id"], job["sender_id"], complaint["id"]),
        )
        payload = conversations._result(result)
    _reply(conn, job, current["draft"], payload)
    conversations.clear(conn, job)
    _terminal(conn, job, "done")


def process_job():
    with ext.db_pool.connection() as conn:
        job = conn.execute(
            """select j.* from whatsapp_processing_jobs j
               left join whatsapp_conversations c using (phone_number_id, sender_id)
               where j.phone_number_id=%s and j.stage in ('download','photo','ready')
                 and j.next_attempt_at<=now()
                 and (j.stage<>'ready'
                      or (c.step='processing' and (
                          not (c.draft ? 'acknowledgement_event_id')
                          or exists (select 1 from whatsapp_outbox ack
                              where ack.event_id::text=c.draft->>'acknowledgement_event_id'
                                and ack.status='sent')))
                      or c.expires_at<=now()
                      or c.draft->>'submission_id' is distinct from j.submission_id::text)
               order by j.created_at for update of j skip locked limit 1""",
            (Config.WHATSAPP_PHONE_NUMBER_ID,),
        ).fetchone()
        if not job:
            return False
        current = _current(conn, job)
        if not current:
            _terminal(conn, job, "cancelled")
            return True
        attempt = job["attempts"] + 1
        try:
            with conn.transaction():
                if attempt > Config.WHATSAPP_MAX_ATTEMPTS:
                    raise transport.WhatsAppError("attempts_exhausted")
                if job["stage"] == "download":
                    image, _, _ = transport.download_media(job["image_id"], "image")
                    jpeg = ai_service.prepare_image(image)
                    # Commit the actual photo before any model call; restart resumes at photo.
                    conn.execute(
                        "update whatsapp_processing_jobs set image_bytes=%s, stage='photo', attempts=0, "
                        "last_error=null, next_attempt_at=now(), updated_at=now() where submission_id=%s",
                        (jpeg, job["submission_id"]),
                    )
                elif job["stage"] == "photo":
                    findings = ai_service.analyse_photo(bytes(job["image_bytes"]))
                    conn.execute(
                        "update whatsapp_processing_jobs set findings=%s, stage='ready', attempts=0, "
                        "last_error=null, next_attempt_at=now(), updated_at=now() where submission_id=%s",
                        (Jsonb(findings), job["submission_id"]),
                    )
                elif current["step"] == "processing":
                    _finalise(conn, job, current["draft"])
        except Exception as error:
            transient, code = queue._failure(error)
            retry = transient and attempt < Config.WHATSAPP_MAX_ATTEMPTS
            conn.execute(
                "update whatsapp_processing_jobs set attempts=%s, last_error=%s, "
                "next_attempt_at=clock_timestamp() + make_interval(secs => %s), updated_at=now() "
                "where submission_id=%s", (attempt, code, queue._backoff(attempt), job["submission_id"]),
            )
            if not retry:
                current = _current(conn, job, lock=True)
                if current:
                    message = ("That photo could not be processed. Please choose New complaint and send another photo."
                               if job["stage"] in ("download", "photo") else
                               "We could not finish reviewing your complaint. It was not submitted. Please choose New complaint to try again.")
                    _reply(conn, job, current["draft"], transport.menu(message))
                    conversations.clear(conn, job)
                _terminal(conn, job, "failed" if current else "cancelled")
            logger.warning("WhatsApp processing %s; stage=%s category=%s attempt=%s",
                           "retry scheduled" if retry else "failed", job["stage"], code, attempt)
        return True
