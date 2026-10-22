from flask import Blueprint

from ..auth import require_api_key
from .admin import bp as admin_bp
from .complaints import bp as complaints_bp
from .map import bp as map_bp
from .users import bp as users_bp
# from .whatsapp import bp as whatsapp_bp

api = Blueprint("api", __name__, url_prefix="/api")
api.before_request(require_api_key)  # mapped endpoints require their own API key

api.register_blueprint(complaints_bp)
api.register_blueprint(admin_bp)
api.register_blueprint(map_bp)
api.register_blueprint(users_bp)
# api.register_blueprint(whatsapp_bp)
