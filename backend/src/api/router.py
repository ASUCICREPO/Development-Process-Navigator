"""REST routing / orchestration for ProcessCanvas (API service, component C8).

This module documents the endpoint -> module-handler mapping and provides a small dispatch helper.
In deployment, API Gateway routes requests to Lambda(s); a Cognito authorizer resolves the caller,
and `build_principal` constructs the Principal used for authorization.
"""
from __future__ import annotations

from ..shared.errors import AppError
from ..shared.types import Principal, Role

# endpoint definition: (METHOD, path) -> description (module that handles it)
ROUTES = {
    ("POST", "/auth/register"): "identity.register",
    ("POST", "/auth/login"): "identity.login",
    ("GET", "/me"): "identity.me",
    ("POST", "/join-codes"): "identity.create_join_code",
    ("POST", "/roster"): "identity.add_to_roster",

    ("GET", "/templates"): "authoring.list_templates",
    ("POST", "/configurations"): "authoring.create_from_template",
    ("PUT", "/configurations/{id}"): "authoring.update",
    ("POST", "/configurations/{id}/apply"): "authoring.apply",
    ("POST", "/configurations/{id}/save-as-template"): "authoring.save_as_template",

    ("GET", "/exercises/{id}"): "exercise.get",
    ("PUT", "/exercises/{id}/placements"): "exercise.save_placements",
    ("POST", "/exercises/{id}/submit"): "exercise.submit",
    ("GET", "/exercises/{id}/attempts/{attemptId}/feedback"): "exercise.feedback",
    ("POST", "/exercises/{id}/verify"): "exercise.verify",
    ("POST", "/exercises/{id}/resubmit"): "exercise.resubmit",

    ("GET", "/students/{id}/history"): "results.history",
    ("GET", "/attempts/{id}"): "results.attempt",
    ("POST", "/attempts/{id}/reflection"): "results.reflection",
    ("GET", "/exercises/{id}/results"): "results.class_results",

    ("POST", "/sessions"): "live_session.start",
    ("POST", "/sessions/{id}/join"): "live_session.join",
    ("GET", "/sessions/{id}/progress"): "live_session.progress",
    ("POST", "/sessions/{id}/end"): "live_session.end",
}


def build_principal(authorizer_claims: dict) -> Principal:
    """Construct a Principal from Cognito authorizer claims."""
    role = Role(authorizer_claims.get("custom:role", "STUDENT"))
    return Principal(user_id=authorizer_claims["sub"], role=role)


def error_response(err: AppError) -> dict:
    return {"statusCode": err.status_code, "body": {"error": err.message}}
