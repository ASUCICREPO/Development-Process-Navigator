"""Unit tests for the exercise lifecycle and correct-and-resubmit-once flow (U3)."""
import pytest

from src.exercise.models import Placement, StudentExerciseState
from src.exercise.service import ExerciseService
from src.exercise.scoring import scoring as sc
from src.shared.errors import ConflictError, ValidationError
from src.shared.types import Phase


def build_service(recorded):
    config = sc.Configuration(activities=[
        sc.ActivityConfig("a", {Phase.PLANNING: 100}),
        sc.ActivityConfig("b", {Phase.CONSTRUCTION: 100}),
    ])
    return ExerciseService(
        config_provider=lambda _eid: config,
        version_provider=lambda _eid: "v1",
        instructor_provider=lambda _eid: "instr-1",
        record_attempt=lambda att: recorded.append(att),
    )


def fresh_state():
    return StudentExerciseState(exercise_id="ex1", student_id="stu1")


def test_submit_requires_complete_sort():
    recorded = []
    svc = build_service(recorded)
    state = fresh_state()
    state.placements = [Placement("a", {Phase.PLANNING})]  # 'b' missing
    with pytest.raises(ValidationError):
        svc.submit(state)


def test_submit_then_resubmit_once_locks():
    recorded = []
    svc = build_service(recorded)
    state = fresh_state()
    state.placements = [Placement("a", {Phase.CONSTRUCTION}), Placement("b", {Phase.CONSTRUCTION})]
    first = svc.submit(state)
    assert first.attempt_number == 1
    assert state.attempt_count == 1

    # correct 'a' and resubmit once
    revised = [Placement("a", {Phase.PLANNING}), Placement("b", {Phase.CONSTRUCTION})]
    final = svc.resubmit(state, revised)
    assert final.attempt_number == 2
    assert final.is_final
    assert final.score_percent == 100
    assert state.locked is True
    assert len(recorded) == 2  # both attempts recorded


def test_second_resubmit_blocked():
    recorded = []
    svc = build_service(recorded)
    state = fresh_state()
    state.placements = [Placement("a", {Phase.PLANNING}), Placement("b", {Phase.CONSTRUCTION})]
    svc.submit(state)
    svc.resubmit(state)
    with pytest.raises(ConflictError):
        svc.resubmit(state)


def test_cannot_submit_twice():
    recorded = []
    svc = build_service(recorded)
    state = fresh_state()
    state.placements = [Placement("a", {Phase.PLANNING}), Placement("b", {Phase.CONSTRUCTION})]
    svc.submit(state)
    with pytest.raises(ConflictError):
        svc.submit(state)


def test_verify_requires_first_submission():
    recorded = []
    svc = build_service(recorded)
    state = fresh_state()
    with pytest.raises(ConflictError):
        svc.verify(state, [])
