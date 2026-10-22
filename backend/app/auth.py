import hmac
import hashlib
import re
from datetime import datetime, timezone
from functools import wraps

from flask import g, request

from . import extensions as ext
from .config import Config
from .responses import fail

# Each endpoint has its OWN key. A key never works on any other endpoint.
ENDPOINT_KEYS = {
    "api.users.create_user": "KEY_CREATE_USER",                  # POST  /api/users
    "api.complaints.submit_complaint": "KEY_SUBMIT_COMPLAINT",    # POST  /api/complaints
    "api.complaints.track_complaint": "KEY_TRACK_COMPLAINT",      # GET   /api/complaints/track/<id>
    "api.complaints.list_complaints": "KEY_LIST_COMPLAINTS",      # GET   /api/complaints
    "api.complaints.get_complaint": "KEY_GET_COMPLAINT",          # GET   /api/complaints/<id>
    "api.admin.dashboard_stats": "KEY_DASHBOARD_STATS",           # GET   /api/admin/dashboard/stats
    "api.map.map_points": "KEY_MAP_POINTS",                       # GET   /api/map/points
}


def _matches(supplied, expected):
    return bool(expected) and hmac.compare_digest(supplied.encode(), expected.encode())


def admin_required(view):
    """All provisioned users are admins; authenticate their existing login session."""
    @wraps(view)
    def protected(*args, **kwargs):
        parts = request.headers.get("Authorization", "").split()
        if (len(parts) != 2 or parts[0].lower() != "bearer"
                or not re.fullmatch(r"[A-Za-z0-9_-]{43}", parts[1])):
            return fail("A valid admin login token is required.", 401, "UNAUTHORIZED")
        token_hash = hashlib.sha256(parts[1].encode("utf-8")).hexdigest()
        with ext.db_pool.connection() as conn:
            user = conn.execute(
                """select u.id, u.is_active, s.expires_at
                   from user_sessions s join users u on u.id = s.user_id
                   where s.token_hash = %s""", (token_hash,),
            ).fetchone()
        if not user or not user["is_active"] or user["expires_at"] <= datetime.now(timezone.utc):
            return fail("A valid admin login token is required.", 401, "UNAUTHORIZED")
        g.admin_user_id = user["id"]
        return view(*args, **kwargs)
    return protected


def require_api_key():
    """Check mapped API keys; login and signed Meta webhooks authenticate separately."""
    if request.method == "OPTIONS":  # CORS preflight carries no custom headers
        return None
    key_name = ENDPOINT_KEYS.get(request.endpoint)
    if key_name is None:  # login/webhooks authenticate in their handlers; Flask handles unknown URLs
        return None

    supplied = request.headers.get("X-API-Key", "")
    if _matches(supplied, getattr(Config, key_name)):
        return None

    # a valid key for a DIFFERENT endpoint -> 403, anything else -> 401
    if any(_matches(supplied, getattr(Config, k)) for k in ENDPOINT_KEYS.values()):
        return fail("This API key is not allowed to use this endpoint.", 403, "FORBIDDEN")
    return fail("Invalid or missing API key.", 401, "UNAUTHORIZED")
