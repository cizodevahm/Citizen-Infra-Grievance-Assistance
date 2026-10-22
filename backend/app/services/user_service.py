import hashlib
import re
import secrets

from psycopg.errors import UniqueViolation
from werkzeug.security import check_password_hash, generate_password_hash

from .. import extensions as ext
from ..config import Config
from ..errors import AppError, ValidationError

_EMAIL = re.compile(r"[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+", re.ASCII)
_PASSWORD_METHOD = "scrypt:32768:8:1"
# Always verify a hash, including for unknown emails, to reduce timing differences.
_DUMMY_PASSWORD_HASH = generate_password_hash(secrets.token_urlsafe(32), method=_PASSWORD_METHOD)


def _email(value):
    if not isinstance(value, str):
        raise ValidationError("A valid email address is required.")
    value = value.strip().lower()
    if len(value) > 254 or "\x00" in value or not _EMAIL.fullmatch(value):
        raise ValidationError("A valid email address is required.")
    return value


def _password(value, creating=False):
    if not isinstance(value, str) or not value or len(value) > 128:
        raise ValidationError("Password must contain between 1 and 128 characters.")
    if creating and len(value) < 12:
        raise ValidationError("Password must contain at least 12 characters.")
    return value


def create_user(name, email, password):
    if not isinstance(name, str) or "\x00" in name or not 1 <= len(name.strip()) <= 100:
        raise ValidationError("Name must contain between 1 and 100 characters.")
    email = _email(email)
    password = _password(password, creating=True)
    password_hash = generate_password_hash(password, method=_PASSWORD_METHOD)

    try:
        with ext.db_pool.connection() as conn:
            user = conn.execute(
                """insert into users (name, email, password_hash)
                   values (%s, %s, %s) returning id, name, email""",
                (name.strip(), email, password_hash),
            ).fetchone()
    except UniqueViolation:
        raise AppError("A user with this email already exists.", 409, "EMAIL_EXISTS") from None
    return user


def login(email, password):
    email = _email(email)
    password = _password(password)
    with ext.db_pool.connection() as conn:
        user = conn.execute(
            "select id, name, email, password_hash, is_active from users where email = %s",
            (email,),
        ).fetchone()

    password_matches = check_password_hash(
        user["password_hash"] if user else _DUMMY_PASSWORD_HASH, password
    )
    if not user or not password_matches or not user["is_active"]:
        raise AppError("Invalid email or password.", 401, "UNAUTHORIZED")

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with ext.db_pool.connection() as conn:
        conn.execute(
            """insert into user_sessions (user_id, token_hash, expires_at)
               values (%s, %s, now() + make_interval(secs => %s))""",
            (user["id"], token_hash, Config.SESSION_TTL_SECONDS),
        )

    return {
        "user": {key: user[key] for key in ("id", "name", "email")},
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": Config.SESSION_TTL_SECONDS,
    }
