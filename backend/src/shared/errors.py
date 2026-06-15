"""Shared error types for the ProcessCanvas backend."""


class AppError(Exception):
    """Base application error with an HTTP-ish status code."""

    status_code = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class ValidationError(AppError):
    status_code = 400


class NotFoundError(AppError):
    status_code = 404


class UnauthorizedError(AppError):
    status_code = 401


class ForbiddenError(AppError):
    status_code = 403


class ConflictError(AppError):
    """Used for concurrency / state-conflict violations (e.g., resubmit-once)."""

    status_code = 409
