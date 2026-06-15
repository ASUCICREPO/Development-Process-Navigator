"""AWS Lambda entrypoint for the ProcessCanvas REST API (API Gateway proxy integration).

Packaged with asset root = `backend/`, so this module is importable as `src.api.lambda_handler`
and intra-package relative imports resolve correctly.
"""
from __future__ import annotations

import json

from ..shared.errors import AppError
from . import app as app_module


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
        },
        "body": json.dumps(body),
    }


def handler(event, context):
    method = (event.get("httpMethod") or "GET").upper()
    path = event.get("path") or "/"

    if method == "OPTIONS":
        return _response(200, {"ok": True})
    if path in ("/", "/health"):
        return _response(200, {"service": "ProcessCanvas API", "status": "ok"})

    try:
        body = json.loads(event["body"]) if event.get("body") else {}
    except (ValueError, TypeError):
        return _response(400, {"error": "Invalid JSON body."})

    principal = app_module.principal_from_event(event)
    try:
        status, result = app_module.dispatch(method, path, body, principal)
        return _response(status, result)
    except AppError as err:
        return _response(err.status_code, {"error": err.message})
    except Exception as err:  # pragma: no cover - safety net
        import traceback
        print("UNHANDLED ERROR for", method, path)
        traceback.print_exc()
        return _response(500, {"error": "Internal error", "detail": str(err)})
