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


class CardType(str, Enum):
    """The five card types from the Instructor Manual's card-sorting exercise.

    - PROCESS: the eight broad process stages (Round 1, sequenced).
    - MAJOR_ACTIVITY: the fifteen major activities placed within/along the process (Round 2).
    - PROFESSIONAL: the professional/role cards matched to activities (Round 3).
    - TASK_DELIVERABLE: representative tasks & deliverables matched to activities (Round 4).
    - DECISION: developer go/no-go decision gates matched to activities (optional Round 5).
    """

    PROCESS = "PROCESS"
    MAJOR_ACTIVITY = "MAJOR_ACTIVITY"
    PROFESSIONAL = "PROFESSIONAL"
    TASK_DELIVERABLE = "TASK_DELIVERABLE"
    DECISION = "DECISION"


class RoundKind(str, Enum):
    """How a round is scored.

    - SEQUENCE_PHASES: order/place cards into ordered process stages (Rounds 1-2).
    - MATCH_TO_ACTIVITY: match cards to one or more major-activity targets (Rounds 3-5).
    """

    SEQUENCE_PHASES = "SEQUENCE_PHASES"
    MATCH_TO_ACTIVITY = "MATCH_TO_ACTIVITY"


class CardStatus(str, Enum):
    CORRECT = "CORRECT"
    PARTIAL = "PARTIAL"
    INCORRECT = "INCORRECT"


class Principal:
    """Authenticated caller context resolved from a verified token."""

    def __init__(self, user_id: str, role: Role):
        self.user_id = user_id
        self.role = role
