"""Meta transport and message builders. Never expose API bodies or signed URLs in errors."""
import logging
import re
import time
from urllib.parse import urlsplit

import httpx

from ..config import Config

# httpx INFO logs full request URLs, including signed media URLs.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png"}
AUDIO_TYPES = {"audio/aac": "aac", "audio/amr": "amr", "audio/mpeg": "mp3",
               "audio/mp4": "m4a", "audio/ogg": "ogg"}


class WhatsAppError(Exception):
    def __init__(self, code, *, transient=False):
        super().__init__(code)
        self.code = code
        self.transient = transient


def text(body):
    return {"type": "text", "text": {"body": body[:4096]}}


def buttons(body, choices):
    return {"type": "interactive", "interactive": {
        "type": "button", "body": {"text": body[:1024]},
        "action": {"buttons": [{"type": "reply", "reply": {"id": key, "title": title}}
                               for key, title in choices]},
    }}


def menu(body="Choose an option:"):
    return buttons(body, [("new_complaint", "New complaint"), ("track_complaint", "Track complaint")])


def location_request():
    return {"type": "interactive", "interactive": {
        "type": "location_request_message",
        "body": {"text": "Photo received. Tap Send location below and share the location of the issue. "
                         "If needed, use attachment → Location to share a pin."},
        "action": {"name": "send_location"},
    }}


def description_request():
    return buttons(
        "Send a short text description or voice note. Sending it submits your complaint automatically. "
        "Skip submits without an additional description. Send Cancel or Menu to stop before submission.",
        [("skip", "Skip")],
    )


def mime_type(value):
    return value.split(";", 1)[0].strip().lower() if isinstance(value, str) else ""


def _client():
    return httpx.Client(timeout=httpx.Timeout(20, connect=5), follow_redirects=False, trust_env=False)


def _check_response(response):
    if 200 <= response.status_code < 300:
        return
    code, transient = None, response.status_code in (408, 425, 429) or response.status_code >= 500
    try:
        error = response.json().get("error", {})
        code = error.get("code")
        transient = transient or error.get("is_transient") is True or code in (1, 2, 4, 17, 32, 613, 130429, 131000, 131016, 131056)
    except (ValueError, AttributeError):
        pass
    safe_code = f"meta_http_{response.status_code}"
    if isinstance(code, int):
        safe_code += f"_code_{code}"
    raise WhatsAppError(safe_code, transient=transient)


def _graph(method, path, **kwargs):
    try:
        with _client() as client:
            response = client.request(method, f"https://graph.facebook.com/{Config.WHATSAPP_GRAPH_VERSION}/{path}",
                                      headers={"Authorization": f"Bearer {Config.WHATSAPP_ACCESS_TOKEN}"}, **kwargs)
            _check_response(response)
            result = response.json()
            if not isinstance(result, dict):
                raise ValueError
            return result
    except httpx.RequestError:
        raise WhatsAppError("meta_transport", transient=True) from None
    except ValueError:
        raise WhatsAppError("meta_invalid_response", transient=True) from None


def send_message(phone_number_id, sender_id, payload):
    if phone_number_id != Config.WHATSAPP_PHONE_NUMBER_ID or not re.fullmatch(r"[0-9]{1,32}", sender_id):
        raise WhatsAppError("invalid_message_destination")
    result = _graph("POST", f"{phone_number_id}/messages", json={
        **payload, "messaging_product": "whatsapp", "recipient_type": "individual", "to": sender_id,
    })
    messages = result.get("messages")
    if not isinstance(messages, list) or not messages or not isinstance(messages[0], dict):
        raise WhatsAppError("meta_missing_message_id", transient=True)
    message_id = messages[0].get("id")
    if not isinstance(message_id, str) or not message_id:
        raise WhatsAppError("meta_missing_message_id", transient=True)
    return message_id


def download_media(media_id, kind):
    if not isinstance(media_id, str) or not re.fullmatch(r"[0-9]{1,64}", media_id):
        raise WhatsAppError("invalid_media_id")
    metadata = _graph("GET", media_id, params={"phone_number_id": Config.WHATSAPP_PHONE_NUMBER_ID})
    types = IMAGE_TYPES if kind == "image" else AUDIO_TYPES
    mime = mime_type(metadata.get("mime_type"))
    if mime not in types:
        raise WhatsAppError("unsupported_media_type")
    limit = min(Config.WHATSAPP_MAX_MEDIA_MB, 5 if kind == "image" else 16) * 1024 * 1024
    size = metadata.get("file_size")
    if isinstance(size, str) and re.fullmatch(r"[0-9]{1,12}", size):
        size = int(size)
    if isinstance(size, bool) or not isinstance(size, int) or not 0 < size <= limit:
        raise WhatsAppError("invalid_media_size")
    url = metadata.get("url")
    try:
        parsed = urlsplit(url) if isinstance(url, str) else None
        host = parsed.hostname if parsed else ""
        if (not parsed or parsed.scheme != "https" or parsed.port not in (None, 443)
                or parsed.username or parsed.password
                or not (host == "lookaside.fbsbx.com" or host.endswith(".fbcdn.net"))):
            raise ValueError
    except (ValueError, AttributeError):
        raise WhatsAppError("untrusted_media_url") from None
    try:
        with _client() as client:
            started = time.monotonic()
            with client.stream("GET", url, headers={"Authorization": f"Bearer {Config.WHATSAPP_ACCESS_TOKEN}"}) as response:
                if response.status_code != 200:
                    # Do not read an unbounded body or follow redirects; retry refreshes metadata.
                    raise WhatsAppError(f"media_http_{response.status_code}",
                                        transient=response.status_code in (404, 408, 429) or response.status_code >= 500)
                if mime_type(response.headers.get("content-type")) != mime:
                    raise WhatsAppError("media_type_mismatch")
                data = bytearray()
                for chunk in response.iter_bytes(chunk_size=64 * 1024):
                    if time.monotonic() - started > 60:
                        raise WhatsAppError("media_timeout", transient=True)
                    data.extend(chunk)
                    if len(data) > limit:
                        raise WhatsAppError("media_too_large")
                if not data or len(data) != size:
                    raise WhatsAppError("media_incomplete", transient=True)
                return bytes(data), f"upload.{types[mime]}", mime
    except httpx.RequestError:
        raise WhatsAppError("media_transport", transient=True) from None
