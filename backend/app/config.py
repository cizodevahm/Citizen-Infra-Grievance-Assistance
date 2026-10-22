import os
import re

from dotenv import load_dotenv

load_dotenv()


def _int(name, default):
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "")

    # photos and voice notes are stored in this S3 bucket
    AWS_ACCESS_KEY_ID = os.getenv("MY_AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY = os.getenv("MY_AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION = os.getenv("MY_AWS_REGION", "")
    S3_BUCKET = os.getenv("MY_AWS_S3_BUCKET", "")
    S3_FOLDER = os.getenv("MY_AWS_S3_FOLDER", "CIGA_assets").strip("/")  # top folder inside the bucket

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    TRANSCRIBE_MODEL = os.getenv("TRANSCRIBE_MODEL", "gpt-4o-transcribe")

    SESSION_TTL_SECONDS = _int("SESSION_TTL_SECONDS", 8 * 60 * 60)
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]

    DEDUP_RADIUS_METERS = _int("DEDUP_RADIUS_METERS", 50)
    OVERDUE_DAYS = _int("OVERDUE_DAYS", 5)
    MAX_UPLOAD_MB = _int("MAX_UPLOAD_MB", 25)
    DB_POOL_MAX = _int("DB_POOL_MAX", 2)

    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    PORT = _int("PORT", 5000)

    # Optional integration: existing web APIs work without Meta credentials.
    WHATSAPP_ENABLED = os.getenv("WHATSAPP_ENABLED", "false").lower() == "true"
    WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET", "")
    WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
    WHATSAPP_GRAPH_VERSION = os.getenv("WHATSAPP_GRAPH_VERSION", "")
    WHATSAPP_CONVERSATION_TTL_SECONDS = _int("WHATSAPP_CONVERSATION_TTL_SECONDS", 1800)
    WHATSAPP_MAX_MEDIA_MB = _int("WHATSAPP_MAX_MEDIA_MB", 16)
    WHATSAPP_MAX_ATTEMPTS = _int("WHATSAPP_MAX_ATTEMPTS", 5)

    REQUIRED = (
        "DATABASE_URL", "OPENAI_API_KEY",
        "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET",
    )

    # attribute -> name in .env, where they differ
    ENV_NAMES = {
        "AWS_ACCESS_KEY_ID": "MY_AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY": "MY_AWS_SECRET_ACCESS_KEY",
        "AWS_REGION": "MY_AWS_REGION", "S3_BUCKET": "MY_AWS_S3_BUCKET",
    }

    @classmethod
    def validate(cls):
        cls.validate_whatsapp()
        if cls.SESSION_TTL_SECONDS <= 0:
            raise RuntimeError("SESSION_TTL_SECONDS must be greater than zero.")
        missing = [cls.ENV_NAMES.get(k, k) for k in cls.REQUIRED
                   if not getattr(cls, k)]
        if missing:
            raise RuntimeError(
                "Missing required environment variables: " + ", ".join(missing)
                + ". Fill these values in backend/.env (see backend.env.example; preserve existing settings)."
            )

    @classmethod
    def validate_whatsapp(cls):
        if not cls.WHATSAPP_ENABLED:
            return
        names = ("WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID",
                 "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN", "WHATSAPP_GRAPH_VERSION")
        missing = [name for name in names if not getattr(cls, name)]
        if missing:
            raise RuntimeError("Missing WhatsApp environment variables: " + ", ".join(missing))
        if not re.fullmatch(r"[0-9]+", cls.WHATSAPP_PHONE_NUMBER_ID):
            raise RuntimeError("WHATSAPP_PHONE_NUMBER_ID must be the numeric Meta ID.")
        if not re.fullmatch(r"v[0-9]+\.0", cls.WHATSAPP_GRAPH_VERSION):
            raise RuntimeError("WHATSAPP_GRAPH_VERSION must match your Meta API version, e.g. v25.0.")
        if cls.WHATSAPP_BUSINESS_ACCOUNT_ID and not cls.WHATSAPP_BUSINESS_ACCOUNT_ID.isascii():
            raise RuntimeError("WHATSAPP_BUSINESS_ACCOUNT_ID must be numeric.")
        if cls.WHATSAPP_BUSINESS_ACCOUNT_ID and not cls.WHATSAPP_BUSINESS_ACCOUNT_ID.isdigit():
            raise RuntimeError("WHATSAPP_BUSINESS_ACCOUNT_ID must be numeric.")
        for name in ("WHATSAPP_CONVERSATION_TTL_SECONDS", "WHATSAPP_MAX_MEDIA_MB", "WHATSAPP_MAX_ATTEMPTS"):
            if getattr(cls, name) <= 0:
                raise RuntimeError(f"{name} must be greater than zero.")
