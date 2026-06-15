"""U3 Exercise & Scoring service: lifecycle + correct-and-resubmit-once.

Orchestrates: validate complete sort -> pure scoring -> build feedback -> record via U4.
Enforces resubmit-once and lock with a conflict guard (maps to DynamoDB conditional writes).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Callable, Optional

from ..shared.errors import ConflictError, ValidationError
from ..shared.types import Phase
from .models import Attempt, Placement, StudentExerciseState
from .scoring import scoring as sc


class ExerciseService:
    def __init__(self, config_provider: Callable[[str], sc.Configuration],
                 version_provider: Callable[[str], str],
                 instructor_provider: Callable[[str], str],
                 record_attempt: Callable[[Attempt], None]):
        # config_provider(exercise_id) -> Configuration (from U2 version snapshot)
        self._config_provider = config_provider
        self._version_provider = version_provider          # exercise_id -> version_id
        self._instructor_provider = instructor_provider    # exercise_id -> instructor_id
        self._record_attempt = record_attempt              # U4 hand-off

    # --- validation -------------------------------------------------------
    def _validate_complete(self, state: StudentExerciseState,
                           config: sc.Configuration) -> None:
        placed_ids = {p.activity_id for p in state.placements if p.phases}
        all_ids = {a.activity_id for a in config.activities}
        missing = all_ids - placed_ids
        if missing:
            raise ValidationError(
                f"Incomplete sort. Place all activities before submitting. Missing: {sorted(missing)}"
            )

    # --- scoring + attempt build -----------------------------------------
    def _score_state(self, state: StudentExerciseState,
                     config: sc.Configuration) -> sc.ScoreResult:
        placements = [
            sc.Placement(activity_id=p.activity_id, phases=frozenset(p.phases))
            for p in state.placements
        ]
        return sc.score(placements, config)

    def _build_attempt(self, state: StudentExerciseState, result: sc.ScoreResult,
                       attempt_number: int, is_final: bool) -> Attempt:
        return Attempt(
            attempt_id=str(uuid.uuid4()),
            exercise_id=state.exercise_id,
            student_id=state.student_id,
            instructor_id=self._instructor_provider(state.exercise_id),
            version_id=self._version_provider(state.exercise_id),
            attempt_number=attempt_number,
            is_final=is_final,
            placements=[Placement(p.activity_id, set(p.phases)) for p in state.placements],
            score_percent=result.score_percent,
            total_earned=result.total_earned,
            denominator=result.denominator,
            card_feedback=[_feedback_to_dict(cf) for cf in result.card_feedback],
            weakest_match=_weakest_to_dict(result.weakest_match),
            created_at=datetime.now(timezone.utc).isoformat(),
        )

    # --- public workflows -------------------------------------------------
    def submit(self, state: StudentExerciseState) -> Attempt:
        """First submission (W3)."""
        if state.attempt_count != 0 or state.locked:
            raise ConflictError("Exercise already submitted.")
        config = self._config_provider(state.exercise_id)
        self._validate_complete(state, config)
        result = self._score_state(state, config)
        attempt = self._build_attempt(state, result, attempt_number=1, is_final=True)
        # First attempt is official unless a resubmission replaces it.
        state.attempt_count = 1
        self._record_attempt(attempt)
        return attempt

    def verify(self, state: StudentExerciseState,
               revised: list[Placement]) -> StudentExerciseState:
        """Pre-resubmission review (W4). No new official scoring."""
        if state.attempt_count != 1 or state.locked:
            raise ConflictError("Verify is only available after the first submission.")
        state.placements = revised
        return state

    def resubmit(self, state: StudentExerciseState,
                 revised: Optional[list[Placement]] = None) -> Attempt:
        """Exactly one final resubmission (W5); locks afterward."""
        if state.attempt_count != 1 or state.locked:
            raise ConflictError("Resubmission is not allowed (already used or not submitted).")
        if revised is not None:
            state.placements = revised
        config = self._config_provider(state.exercise_id)
        self._validate_complete(state, config)
        result = self._score_state(state, config)
        attempt = self._build_attempt(state, result, attempt_number=2, is_final=True)
        state.attempt_count = 2
        state.locked = True
        self._record_attempt(attempt)
        return attempt


def _feedback_to_dict(cf: sc.CardFeedback) -> dict:
    return {
        "activityId": cf.activity_id,
        "placedPhases": sorted(p.value for p in cf.placed_phases),
        "perPhase": [
            {"phase": pe.phase.value, "status": pe.status.value, "weight": pe.weight}
            for pe in cf.per_phase
        ],
        "earned": cf.earned,
        "max": cf.max,
    }


def _weakest_to_dict(wm: Optional[sc.WeakestMatch]) -> Optional[dict]:
    if wm is None:
        return None
    return {"activityId": wm.activity_id, "phase": wm.phase.value, "gap": wm.gap}
