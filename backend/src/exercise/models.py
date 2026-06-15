"""U3 Exercise domain models."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from ..shared.types import Phase


@dataclass
class Placement:
    activity_id: str
    phases: set[Phase] = field(default_factory=set)


@dataclass
class StudentExerciseState:
    exercise_id: str
    student_id: str
    placements: list[Placement] = field(default_factory=list)
    attempt_count: int = 0          # 0, 1 (after submit), 2 (after resubmit)
    locked: bool = False

    def placement_map(self) -> dict[str, set[Phase]]:
        return {p.activity_id: set(p.phases) for p in self.placements}


@dataclass
class Attempt:
    attempt_id: str
    exercise_id: str
    student_id: str
    instructor_id: str
    version_id: str
    attempt_number: int
    is_final: bool
    placements: list[Placement]
    score_percent: int
    total_earned: int
    denominator: int
    card_feedback: list[dict]
    weakest_match: Optional[dict]
    reflection_response: Optional[str] = None
    session_id: Optional[str] = None
    created_at: Optional[str] = None
