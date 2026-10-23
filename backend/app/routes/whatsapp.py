"""Fast Meta webhook: authenticate, validate, durably enqueue, then acknowledge."""
import hashlib
import hmac
import json
import logging
import re

from flask import Blueprint, Response, request

from ..config import Config
from ..errors import ValidationError
from ..responses import fail, ok
from ..services import whatsapp_queue

bp = Blueprint("whatsapp", __name__, url_prefix="/whatsapp")
logger = logging.getLogger(__name__)
MAX_WEBHOOK_BYTES = 1024 * 1024


class _HideVerificationQuery(logging.Filter):
    def filter(self, record):
        # Flask's development server normally logs hub.verify_token in its access line.
        record.msg = re.sub(r"(/api/whatsapp/webhook)\?[^\s]*", r"\1?[redacted]", record.getMessage())
        record.args = ()
        return True


logging.getLogger("werkzeug").addFilter(_HideVerificationQuery())


def _invalid_json_constant(_):
    raise ValueError("Non-finite JSON constant")


@bp.route("/webhook", methods=["GET", "POST"])
def webhook():
    if not Config.WHATSAPP_ENABLED:
        return fail("Not found.", 404, "NOT_FOUND")
    if request.method == "GET":
        supplied = request.args.get("hub.verify_token", "")
        if (request.args.get("hub.mode") != "subscribe"
                or not Config.WHATSAPP_VERIFY_TOKEN
                or not hmac.compare_digest(supplied.encode(), Config.WHATSAPP_VERIFY_TOKEN.encode())
                or not request.args.get("hub.challenge")):
            return fail("Invalid webhook verification.", 403, "FORBIDDEN")
        return Response(request.args["hub.challenge"], mimetype="text/plain")

    if request.content_length is not None and request.content_length > MAX_WEBHOOK_BYTES:
        return fail("Webhook payload too large.", 413, "PAYLOAD_TOO_LARGE")
    raw = request.stream.read(MAX_WEBHOOK_BYTES + 1)
    if len(raw) > MAX_WEBHOOK_BYTES:
        return fail("Webhook payload too large.", 413, "PAYLOAD_TOO_LARGE")
    expected = "sha256=" + hmac.new(Config.WHATSAPP_APP_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    signature = request.headers.get("X-Hub-Signature-256", "")
    if not Config.WHATSAPP_APP_SECRET or not hmac.compare_digest(signature.encode(), expected.encode()):
        return fail("Invalid webhook signature.", 403, "FORBIDDEN")
    try:
        payload = json.loads(raw, parse_constant=_invalid_json_constant)
    except (ValueError, UnicodeDecodeError, RecursionError):
        raise ValidationError("A valid webhook JSON object is required.") from None
    events = whatsapp_queue.parse_webhook(payload)
    try:
        # Returning only after the pool context commits is essential for Meta retries.
        whatsapp_queue.enqueue(events)
    except Exception as error:
        logger.error("WhatsApp enqueue failed (%s); returning 503 for redelivery", type(error).__name__)
        return fail("Webhook queue temporarily unavailable.", 503, "QUEUE_UNAVAILABLE")
    return ok({"received": True})
