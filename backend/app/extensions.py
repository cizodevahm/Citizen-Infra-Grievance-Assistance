"""Shared clients. Other modules use:  from .. import extensions as ext ; ext.db_pool ..."""
import boto3
import psycopg
from openai import OpenAI
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import Config

openai_client = None
s3_client = None
db_pool = None


def init_extensions(app):
    global openai_client, s3_client, db_pool

    openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)
    s3_client = boto3.client(
        "s3",
        region_name=Config.AWS_REGION,
        aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY,
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
