"""Create complaints (with the 50 m merge) and update their status."""
import logging

from psycopg.types.json import Jsonb

from .. import extensions as ext
from ..config import Config
from ..errors import NotFoundError, RejectedError
from . import ai_service, storage_service
from .query_service import get_detail
from .tracking import new_tracking_id

logger = logging.getLogger(__name__)

# One global lock so two simultaneous reports at the same spot cannot both become "main" tickets.
_LOCK_KEY = 7_424_001

_FIND_PARENT = """
select id, tracking_id, status, acknowledged_at
from complaints
where parent_id is null
  and deleted_at is null
  and category = %(category)s
  and status <> 'completed'
  and ST_DWithin(geom, ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)::geography, %(radius)s::float8)
order by ST_Distance(geom, ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)::geography)
limit 1
"""

_INSERT = """
insert into complaints (
  tracking_id, parent_id, status, category, severity, is_urgent, department, summary,
  original_text_english, raw_text, transcript, user_message, ai_decision, image_url, audio_url,
  lat, lng, geom, acknowledged_at, ai_raw
) values (
  %(tracking_id)s, %(parent_id)s, %(status)s, %(category)s, %(severity)s, %(is_urgent)s,
  %(department)s, %(summary)s, %(original_text_english)s, %(raw_text)s, %(transcript)s,
  %(user_message)s, %(ai_decision)s, %(image_url)s, %(audio_url)s, %(lat)s, %(lng)s,
  ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)::geography,
  %(acknowledged_at)s, %(ai_raw)s
)
returning id
"""

_BUMP_PARENT = """
update complaints
set report_count = report_count + 1,
    is_urgent    = is_urgent or %(urgent)s::boolean,
    severity     = case when %(urgent)s::boolean then 'urgent' else severity end,
    updated_at   = now()
where id = %(id)s
returning report_count
"""

_HISTORY = """
insert into status_history (complaint_id, old_status, new_status, changed_by)
values (%s, %s, %s, %s)
"""


def submit(image_bytes, audio, text, lat, lng):
    """Whole submit flow. `audio` is None or (bytes, filename, mimetype)."""
    jpeg = ai_service.prepare_image(image_bytes)

    transcript = None
    if audio:
        transcript = ai_service.transcribe(*audio)

    combined_text = "\n".join(p for p in (text, transcript) if p)
    ai = ai_service.triage(combined_text, jpeg)

    if not ai["valid"] or ai["category"] == "none":
        _log_rejection(ai, text, lat, lng)
        raise RejectedError(
            ai.get("rejection_reason")
            or "This does not look like an infrastructure problem. Please send a clear photo of the issue."
        )

    # Only store files for accepted complaints
    image_url = storage_service.upload(jpeg, "jpg", "image/jpeg")
    audio_url = None
    if audio:
        data, filename, mimetype = audio
        audio_url = storage_service.upload(
            data, storage_service.audio_extension(filename, mimetype),
            mimetype or "application/octet-stream",
        )

    return create_complaint(ai, lat, lng, text, transcript, combined_text, image_url, audio_url)


def create_complaint(ai, lat, lng, raw_text, transcript, user_message, image_url, audio_url):
    severity = "urgent" if ai["urgent"] else ai["severity"]
    is_urgent = bool(ai["urgent"]) or severity == "urgent"

    with ext.db_pool.connection() as conn:  # commits on success, rolls back on error
        with conn.cursor() as cur:
            cur.execute("select pg_advisory_xact_lock(%s)", (_LOCK_KEY,))

            cur.execute(_FIND_PARENT, {
                "lat": lat, "lng": lng, "category": ai["category"],
                "radius": Config.DEDUP_RADIUS_METERS,
            })
            parent = cur.fetchone()

            tracking_id = _unique_tracking_id(cur)
            cur.execute(_INSERT, {
                "tracking_id": tracking_id,
                "parent_id": parent["id"] if parent else None,
                # a sub ticket joins its main ticket's current state
                "status": parent["status"] if parent else "pending",
                "category": ai["category"],
                "severity": severity,
                "is_urgent": is_urgent,
                "department": ai["department"],
                "summary": ai["summary"],
                "original_text_english": ai["original_text_english"],
                "raw_text": raw_text or None,
                "transcript": transcript,
                "user_message": user_message or None,
                "ai_decision": ai["ai_decision"],
                "image_url": image_url,
                "audio_url": audio_url,
                "lat": lat, "lng": lng,
                "acknowledged_at": parent["acknowledged_at"] if parent else None,
                "ai_raw": Jsonb(ai),
            })
            new_id = cur.fetchone()["id"]
            cur.execute(_HISTORY, (new_id, None, parent["status"] if parent else "pending", "system"))

            report_count = 1
            if parent:
                cur.execute(_BUMP_PARENT, {"id": parent["id"], "urgent": is_urgent})
                report_count = cur.fetchone()["report_count"]

    return {
        "tracking_id": tracking_id,
        "status": parent["status"] if parent else "pending",
        "category": ai["category"],
        "severity": severity,
        "is_urgent": is_urgent,
        "department": ai["department"],
        "summary": ai["summary"],
        "user_message": user_message or None,
        "ai_decision": ai["ai_decision"],
        "image_url": image_url,
        "audio_url": audio_url,
        "is_merged": parent is not None,
        "parent_tracking_id": parent["tracking_id"] if parent else None,
        "report_count": report_count,
    }


def update_status(tracking_id, new_status, changed_by):
    """Set only the ticket matching the supplied tracking ID."""
    with ext.db_pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select id, parent_id from complaints where tracking_id = %s and deleted_at is null for update",
                (tracking_id,),
            )
            row = cur.fetchone()
            if not row:
                raise NotFoundError(f"No complaint found with tracking ID {tracking_id}.")

            cur.execute(
                "select id, status from complaints where id = %s and status <> %s for update",
                (row["id"], new_status),
            )
            changing = cur.fetchall()

            if changing:
                cur.execute(
                    """
                    update complaints
                    set status = %(s)s::text,
                        updated_at = now(),
                        acknowledged_at = case when %(s)s::text <> 'pending'
                                               then coalesce(acknowledged_at, now())
                                               else acknowledged_at end,
                        resolved_at = case when %(s)s::text = 'completed' then now() else null end
                    where id = %(id)s
                    """,
                    {"s": new_status, "id": row["id"]},
                )
                cur.executemany(
                    _HISTORY,
                    [(c["id"], c["status"], new_status, changed_by) for c in changing],
                )

    detail = get_detail("tracking_id", tracking_id)
    detail["tickets_updated"] = len(changing)
    return detail


def delete_complaint(tracking_id, deleted_by, reason):
    """Soft-delete only the ticket matching the supplied tracking ID."""
    with ext.db_pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select id, parent_id, status, deleted_at from complaints where tracking_id = %s for update",
                (tracking_id,),
            )
            row = cur.fetchone()
            if not row:
                raise NotFoundError(f"No complaint found with tracking ID {tracking_id}.")

            deleted = row["deleted_at"] is None
            if deleted:
                cur.execute(
                    """
                    update complaints
                    set deleted_at = now(),
                        deleted_by = %(deleted_by)s,
                        delete_reason = %(reason)s,
                        updated_at = now()
                    where id = %(id)s
                    """,
                    {"id": row["id"], "deleted_by": deleted_by, "reason": reason},
                )
                cur.execute(_HISTORY, (row["id"], row["status"], "deleted", deleted_by))
                if row["parent_id"]:  # a deleted sub report no longer counts towards its main ticket
                    cur.execute(
                        "update complaints set report_count = greatest(report_count - 1, 1), "
                        "updated_at = now() where id = %s",
                        (row["parent_id"],),
                    )

    detail = get_detail("tracking_id", tracking_id)
    detail["tickets_deleted"] = 1 if deleted else 0
    return detail


def _unique_tracking_id(cur):
    for _ in range(10):
        tid = new_tracking_id()
        cur.execute("select 1 from complaints where tracking_id = %s", (tid,))
        if not cur.fetchone():
            return tid
    raise RuntimeError("Could not generate a unique tracking ID.")


def _log_rejection(ai, text, lat, lng):
    try:
        with ext.db_pool.connection() as conn:
            conn.execute(
                "insert into rejected_submissions (reason, raw_text, lat, lng, ai_raw) "
                "values (%s, %s, %s, %s, %s)",
                (ai.get("rejection_reason"), text or None, lat, lng, Jsonb(ai)),
            )
    except Exception:
        logger.exception("Could not log rejected submission")
