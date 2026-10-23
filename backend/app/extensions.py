"""Shared clients. Other modules use:  from .. import extensions as ext ; ext.db_pool ..."""
import boto3
import psycopg
from botocore.config import Config as BotoConfig
from openai import OpenAI
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import Config

openai_client = None
s3_client = None
db_pool = None


def init_extensions(app, *, worker=False):
    global openai_client, s3_client, db_pool

    openai_options = {"timeout": 60, "max_retries": 0} if worker else {}
    openai_client = OpenAI(api_key=Config.OPENAI_API_KEY, **openai_options)
    storage_options = {"config": BotoConfig(connect_timeout=5, read_timeout=20,
                                           retries={"max_attempts": 2, "mode": "standard"})} if worker else {}
    s3_client = boto3.client(
        "s3",
        region_name=Config.AWS_REGION,
        aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
        **storage_options,
    )

    # prepare_threshold=None is required when using Supabase's pooled connections (pgbouncer)
    db_pool = ConnectionPool(
        Config.DATABASE_URL,
        min_size=0,
        max_size=Config.DB_POOL_MAX,
        kwargs={"row_factory": dict_row, "prepare_threshold": None},
        check=ConnectionPool.check_connection,
        timeout=10,
        max_lifetime=300,
        max_idle=60,
        reconnect_timeout=10,
        open=True,
    )
    _check_database()


def _check_database():
    """Fail fast at startup if the DB is unreachable or a migration has not been run."""
    with db_pool.connection() as conn:
        try:
            conn.execute("select deleted_at, deleted_by, delete_reason from complaints limit 0")
        except psycopg.errors.UndefinedColumn:
            raise RuntimeError(
                "Database is missing the soft-delete columns. "
                "Run migrations/002_soft_delete_complaints.sql in the Supabase SQL editor."
            ) from None
    with db_pool.connection() as conn:
        try:
            conn.execute("select user_message, ai_decision from complaints limit 0")
        except psycopg.errors.UndefinedColumn:
            raise RuntimeError(
                "Database is missing the user_message / ai_decision columns. "
                "Run migrations/003_user_message_ai_decision.sql in the Supabase SQL editor."
            ) from None
    with db_pool.connection() as conn:
        try:
            conn.execute(
                "select u.id, u.name, u.email, u.password_hash, u.is_active, u.created_at, "
                "s.id, s.token_hash, s.created_at, s.expires_at "
                "from users u left join user_sessions s on s.user_id = u.id limit 0"
            )
        except (psycopg.errors.UndefinedTable, psycopg.errors.UndefinedColumn):
            raise RuntimeError(
                "Database is missing the admin authentication tables or columns. "
                "Run migrations/004_users_and_sessions.sql in the Supabase SQL editor."
            ) from None
    if Config.WHATSAPP_ENABLED:
        with db_pool.connection() as conn:
            try:
                conn.execute("select phone_number_id, sender_id, step, draft, expires_at, updated_at from whatsapp_conversations limit 0")
                conn.execute("select id, phone_number_id, sender_id, message_id, message, message_at, received_at, status, attempts, next_attempt_at, last_error from whatsapp_events limit 0")
                conn.execute("select submission_id, phone_number_id, sender_id, complaint_id, created_at from whatsapp_complaints limit 0")
                conn.execute("select id, event_id, phone_number_id, sender_id, payload, status, attempts, next_attempt_at, expires_at, meta_message_id, last_error, created_at from whatsapp_outbox limit 0")
            except (psycopg.errors.UndefinedTable, psycopg.errors.UndefinedColumn):
                raise RuntimeError(
                    "WhatsApp schema is missing or incompatible. Inspect the existing tables; "
                    "migrations/005_whatsapp.sql is for fresh setup, not a repair migration."
                ) from None
