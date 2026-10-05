from flask import Blueprint, request

from ..constants import CATEGORIES, STATUSES
from ..errors import ValidationError
from ..responses import ok
from ..services import complaint_service, query_service
from ..services.tracking import normalize_tracking_id
from ..utils.validators import parse_bool, parse_choices, parse_float, parse_int

bp = Blueprint("complaints", __name__, url_prefix="/complaints")


@bp.post("")
def submit_complaint():
    """Form submit. multipart/form-data: image + lat + lng required; text + audio optional."""
    image = request.files.get("image")
    if not image or not image.filename:
        raise ValidationError("A photo is required (form field 'image').")
    image_bytes = image.read()
    if not image_bytes:
        raise ValidationError("The uploaded photo is empty.")

    lat = parse_float(request.form.get("lat"), "lat", -90, 90)
    lng = parse_float(request.form.get("lng"), "lng", -180, 180)
    text = (request.form.get("text") or "").strip()[:2000]

    audio = None
    audio_file = request.files.get("audio")
    if audio_file and audio_file.filename:
        audio_bytes = audio_file.read()
        if audio_bytes:
            audio = (audio_bytes, audio_file.filename, audio_file.mimetype or "audio/webm")

    result = complaint_service.submit(image_bytes, audio, text, lat, lng)
    return ok(result, status=201)


@bp.get("")
def list_complaints():
    page = parse_int(request.args.get("page"), "page", 1)
    limit = parse_int(request.args.get("limit"), "limit", 20, max_value=100)
    categories = parse_choices(request.args.get("category"), "category", CATEGORIES)
    statuses = parse_choices(request.args.get("status"), "status", STATUSES)

    sort_by = (request.args.get("sort_by") or "created_at").lower()
    if sort_by not in ("id", "created_at"):
        raise ValidationError("'sort_by' must be 'id' or 'created_at'.")
    order = (request.args.get("order") or "desc").lower()
    if order not in ("asc", "desc"):
        raise ValidationError("'order' must be 'asc' or 'desc'.")

    rows, meta = query_service.list_complaints(
        page, limit, categories, statuses, sort_by, order,
        main_only=parse_bool(request.args.get("main_only")),
        urgent_only=parse_bool(request.args.get("urgent")),
    )
    return ok(rows, meta)


@bp.get("/track/<tracking_id>")
def track_complaint(tracking_id):
    return ok(query_service.get_detail("tracking_id", normalize_tracking_id(tracking_id)))


@bp.get("/<int:complaint_id>")
def get_complaint(complaint_id):
    return ok(query_service.get_detail("id", complaint_id))


@bp.patch("/<tracking_id>/status")
def update_status(tracking_id):
    body = request.get_json(silent=True) or {}
    new_status = str(body.get("status") or "").lower()
    if new_status not in STATUSES:
        raise ValidationError(f"'status' must be one of: {', '.join(STATUSES)}.")
    changed_by = str(body.get("changed_by") or "admin")[:100]
    return ok(complaint_service.update_status(normalize_tracking_id(tracking_id), new_status, changed_by))


@bp.delete("/<tracking_id>")
def delete_complaint(tracking_id):
    body = request.get_json(silent=True) or {}
    deleted_by = str(body.get("deleted_by") or body.get("changed_by") or "admin")[:100]
    reason = str(body.get("reason") or body.get("delete_reason") or "").strip()[:500] or None
    return ok(complaint_service.delete_complaint(normalize_tracking_id(tracking_id), deleted_by, reason))
