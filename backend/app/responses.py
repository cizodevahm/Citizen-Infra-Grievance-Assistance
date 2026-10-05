from flask import jsonify


def ok(data=None, meta=None, status=200, **extra):
    body = {"success": True, "data": data, "error": None}
    if meta is not None:
        body["meta"] = meta
    body.update(extra)
    return jsonify(body), status


def fail(message, status=400, code="BAD_REQUEST"):
    return jsonify({
        "success": False,
        "data": None,
        "error": {"code": code, "message": message},
    }), status
