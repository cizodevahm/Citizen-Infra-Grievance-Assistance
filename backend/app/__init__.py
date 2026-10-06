import logging
from datetime import date, datetime
from decimal import Decimal

from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from openai import OpenAIError
from werkzeug.exceptions import HTTPException

from .config import Config
from .errors import AppError
from .extensions import init_extensions
from .responses import fail
from .routes import api

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


class AppJSONProvider(DefaultJSONProvider):
    sort_keys = False
    ensure_ascii = False

    def default(self, o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)


def create_app():
    Config.validate()

    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_UPLOAD_MB * 1024 * 1024
    app.json = AppJSONProvider(app)

    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
         allow_headers=["Content-Type", "X-API-Key"])

    init_extensions(app)
    app.register_blueprint(api)
    _register_error_handlers(app)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


def _register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(e):
        return fail(e.message, e.status, e.code)

    @app.errorhandler(OpenAIError)
    def handle_openai_error(e):
        logger.error("OpenAI error: %s", e)
        if getattr(e, "status_code", None) == 429:
            return fail("The AI service is out of quota or rate limited. Try again later.", 503, "AI_UNAVAILABLE")
        return fail("The AI service failed to process this request.", 502, "AI_ERROR")

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        if e.code == 413:
            return fail(f"Upload too large (max {Config.MAX_UPLOAD_MB} MB).", 413, "PAYLOAD_TOO_LARGE")
        return fail(e.description, e.code, e.name.upper().replace(" ", "_"))

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        logger.exception("Unhandled error")
        return fail("Internal server error.", 500, "INTERNAL_ERROR")
