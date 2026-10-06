import os

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

    # one API key per endpoint (see app/auth.py for which key unlocks which endpoint)
    KEY_SUBMIT_COMPLAINT = os.getenv("KEY_SUBMIT_COMPLAINT", "")
    KEY_TRACK_COMPLAINT = os.getenv("KEY_TRACK_COMPLAINT", "")
    KEY_LIST_COMPLAINTS = os.getenv("KEY_LIST_COMPLAINTS", "")
    KEY_GET_COMPLAINT = os.getenv("KEY_GET_COMPLAINT", "")
    KEY_UPDATE_STATUS = os.getenv("KEY_UPDATE_STATUS", "")
    KEY_DASHBOARD_STATS = os.getenv("KEY_DASHBOARD_STATS", "")
    KEY_MAP_POINTS = os.getenv("KEY_MAP_POINTS", "")
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]

    DEDUP_RADIUS_METERS = _int("DEDUP_RADIUS_METERS", 50)
    OVERDUE_DAYS = _int("OVERDUE_DAYS", 5)
    MAX_UPLOAD_MB = _int("MAX_UPLOAD_MB", 25)
    DB_POOL_MAX = _int("DB_POOL_MAX", 2)

    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    PORT = _int("PORT", 5000)

    REQUIRED = (
        "DATABASE_URL", "OPENAI_API_KEY",
        "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET",
    )
    API_KEY_NAMES = (
        "KEY_SUBMIT_COMPLAINT", "KEY_TRACK_COMPLAINT", "KEY_LIST_COMPLAINTS", "KEY_GET_COMPLAINT",
        "KEY_UPDATE_STATUS", "KEY_DASHBOARD_STATS", "KEY_MAP_POINTS",
    )

    # attribute -> name in .env, where they differ
    ENV_NAMES = {
        "AWS_ACCESS_KEY_ID": "MY_AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY": "MY_AWS_SECRET_ACCESS_KEY",
        "AWS_REGION": "MY_AWS_REGION", "S3_BUCKET": "MY_AWS_S3_BUCKET",
    }

    @classmethod
    def validate(cls):
        missing = [cls.ENV_NAMES.get(k, k) for k in cls.REQUIRED + cls.API_KEY_NAMES
                   if not getattr(cls, k)]
        if missing:
            raise RuntimeError(
                "Missing required environment variables: " + ", ".join(missing)
                + ". Copy .env.example to .env and fill them in "
                "(generate the API keys with: python scripts/generate_keys.py)."
            )
        values = [getattr(cls, k) for k in cls.API_KEY_NAMES]
        if len(set(values)) != len(values):
            raise RuntimeError("Every KEY_* value in .env must be different. "
                               "Run: python scripts/generate_keys.py")
