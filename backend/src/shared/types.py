"""Shared domain types used across modules."""
from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    INSTRUCTOR = "INSTRUCTOR"
    STUDENT = "STUDENT"


class Phase(str, Enum):
    """Fixed real-estate-development phases (instructor-non-editable)."""

    PLANNING = "PLANNING"
    CONSTRUCTION = "CONSTRUCTION"
    OPERATIONS = "OPERATIONS"

    @classmethod
    def ordered(cls) -> list["Phase"]:
        return [cls.PLANNING, cls.CONSTRUCTION, cls.OPERATIONS]


class CardStatus(str, Enum):
    CORRECT = "CORRECT"
    PARTIAL = "PARTIAL"
    INCORRECT = "INCORRECT"


class Principal:
    """Authenticated caller context resolved from a verified token."""

    def __init__(self, user_id: str, role: Role):
        self.user_id = user_id
        self.role = role
