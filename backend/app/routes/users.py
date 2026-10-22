from flask import Blueprint, request

from ..errors import ValidationError
from ..responses import ok
from ..services import user_service

bp = Blueprint("users", __name__)


def _json_body():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ValidationError("A JSON object is required.")
    return body


@bp.post("/users")
def create_user():
    body = _json_body()
    return ok(user_service.create_user(
        body.get("name"), body.get("email"), body.get("password")
    ), status=201)


@bp.post("/auth/login")
def login():
    body = _json_body()
    response, status = ok(user_service.login(body.get("email"), body.get("password")))
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return response, status
