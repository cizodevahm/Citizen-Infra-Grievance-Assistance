import hashlib
import re
from datetime import datetime, timezone

from flask import g, request

from . import extensions as ext
from .responses import fail

# All other registered /api endpoints require an active admin session.
PUBLIC_ENDPOINTS = {
    "api.complaints.submit_complaint",
    "api.complaints.track_complaint",
    "api.users.login",
    "api.whatsapp.webhook",  # Meta challenge / HMAC verification, not an admin session.
}


def admin_required():
    """All provisioned users are admins; authenticate their existing login session."""
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
    return None


def protect_api():
    """Protect API routes by default; leave only explicit public routes open."""
    if request.method == "OPTIONS" or request.endpoint is None:
        return None
    if request.endpoint in PUBLIC_ENDPOINTS:
        return None
    return admin_required()
