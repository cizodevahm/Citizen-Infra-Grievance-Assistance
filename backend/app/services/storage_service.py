import re
from pathlib import Path
from uuid import uuid4

from .. import extensions as ext
from ..config import Config


def upload(data, extension, content_type):
    """Upload bytes to the S3 folder and return the public URL. Photos and audio share one folder."""
    key = f"{uuid4().hex}.{extension}"
    if Config.S3_FOLDER:
        key = f"{Config.S3_FOLDER}/{key}"
    ext.s3_client.put_object(Bucket=Config.S3_BUCKET, Key=key, Body=data, ContentType=content_type)
    return f"https://{Config.S3_BUCKET}.s3.{Config.AWS_REGION}.amazonaws.com/{key}"


def audio_extension(filename, mimetype):
    suffix = Path(filename or "").suffix.lstrip(".").lower()
    if re.fullmatch(r"[a-z0-9]{2,5}", suffix):
        return suffix
    if mimetype and "/" in mimetype:
        guess = mimetype.split("/")[1].split(";")[0]
        if re.fullmatch(r"[a-z0-9]{2,5}", guess):
            return guess
    return "bin"
