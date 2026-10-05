import hmac

from flask import request

from .config import Config
from .responses import fail

# Each endpoint has its OWN key. A key never works on any other endpoint.
ENDPOINT_KEYS = {
    "api.complaints.submit_complaint": "KEY_SUBMIT_COMPLAINT",    # POST  /api/complaints
    "api.complaints.track_complaint": "KEY_TRACK_COMPLAINT",      # GET   /api/complaints/track/<id>
    "api.complaints.list_complaints": "KEY_LIST_COMPLAINTS",      # GET   /api/complaints
    "api.complaints.get_complaint": "KEY_GET_COMPLAINT",          # GET   /api/complaints/<id>
    "api.complaints.update_status": "KEY_UPDATE_STATUS",          # PATCH /api/complaints/<id>/status
    "api.complaints.delete_complaint": "KEY_UPDATE_STATUS",       # DELETE /api/complaints/<id>
    "api.admin.dashboard_stats": "KEY_DASHBOARD_STATS",           # GET   /api/admin/dashboard/stats
    "api.map.map_points": "KEY_MAP_POINTS",                       # GET   /api/map/points
}


def _matches(supplied, expected):
    return bool(expected) and hmac.compare_digest(supplied.encode(), expected.encode())


def require_api_key():
    """before_request hook for every /api route. Frontend sends header: X-API-Key"""
    if request.method == "OPTIONS":  # CORS preflight carries no custom headers
        return None
    key_name = ENDPOINT_KEYS.get(request.endpoint)
    if key_name is None:  # unknown URL: let Flask answer 404
        return None

    supplied = request.headers.get("X-API-Key", "")
    if _matches(supplied, getattr(Config, key_name)):
        return None

    # a valid key for a DIFFERENT endpoint -> 403, anything else -> 401
    if any(_matches(supplied, getattr(Config, k)) for k in ENDPOINT_KEYS.values()):
        return fail("This API key is not allowed to use this endpoint.", 403, "FORBIDDEN")
    return fail("Invalid or missing API key.", 401, "UNAUTHORIZED")
