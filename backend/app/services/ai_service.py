import base64
import io
import json
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageOps

from .. import extensions as ext
from ..config import Config
from ..errors import AIError, ValidationError

SCHEMA = {
    "name": "grievance_triage",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["valid", "rejection_reason", "category", "severity", "urgent",
                     "department", "summary", "original_text_english"],
        "properties": {
            "valid": {"type": "boolean"},
            "rejection_reason": {"type": "string"},
            "category": {"type": "string",
                         "enum": ["pothole", "streetlight", "water_leak", "drain", "other", "none"]},
            "severity": {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
            "urgent": {"type": "boolean"},
            "department": {"type": "string",
                           "enum": ["roads", "electricity", "water_supply", "drainage", "other", "none"]},
            "summary": {"type": "string"},
            "original_text_english": {"type": "string"},
        },
    },
}


@lru_cache(maxsize=1)
def _system_prompt():
    path = Path(__file__).resolve().parents[2] / "prompts" / "triage_system_prompt.txt"
    return path.read_text(encoding="utf-8")


def prepare_image(raw_bytes):
    """Validate the upload, fix phone rotation, downscale, return JPEG bytes."""
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img = ImageOps.exif_transpose(img).convert("RGB")
    except Exception:
        raise ValidationError("Unsupported or corrupt image. Please upload a JPG or PNG photo.")
    img.thumbnail((1600, 1600))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def transcribe(audio_bytes, filename, mimetype):
    result = ext.openai_client.audio.transcriptions.create(
        model=Config.TRANSCRIBE_MODEL,
        file=(filename or "voice.webm", audio_bytes, mimetype or "audio/webm"),
    )
    return (result.text or "").strip()


def triage(text, jpeg_bytes):
    """One request: citizen text (+ voice transcript) and the photo. Location is never sent."""
    data_url = "data:image/jpeg;base64," + base64.b64encode(jpeg_bytes).decode()
    content = [
        {"type": "text",
         "text": f"Citizen message: {text or '(no text provided, use the photo only)'}"},
        {"type": "image_url", "image_url": {"url": data_url}},
    ]
    resp = ext.openai_client.chat.completions.create(
        model=Config.OPENAI_MODEL,
        messages=[{"role": "system", "content": _system_prompt()},
                  {"role": "user", "content": content}],
        response_format={"type": "json_schema", "json_schema": SCHEMA},
        temperature=0.2,
    )
    raw = resp.choices[0].message.content
    if not raw:
        raise AIError("The AI could not process this submission. Please try another photo.")
    return json.loads(raw)
