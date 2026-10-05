from flask import Blueprint

from ..auth import require_api_key
from .admin import bp as admin_bp
from .complaints import bp as complaints_bp
from .map import bp as map_bp

api = Blueprint("api", __name__, url_prefix="/api")
api.before_request(require_api_key)  # every /api route needs the X-API-Key header

api.register_blueprint(complaints_bp)
api.register_blueprint(admin_bp)
api.register_blueprint(map_bp)
