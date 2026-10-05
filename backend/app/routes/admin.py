from flask import Blueprint

from ..responses import ok
from ..services import dashboard_service

bp = Blueprint("admin", __name__, url_prefix="/admin")


@bp.get("/dashboard/stats")
def dashboard_stats():
    return ok(dashboard_service.get_stats())
