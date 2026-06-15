"""Unit tests for the pure scoring module (U3 / C5)."""
from src.exercise.scoring import scoring as sc
from src.shared.types import CardStatus, Phase


def cfg(*activities):
    return sc.Configuration(activities=list(activities))


def act(aid, **weights):
    w = {Phase[k]: v for k, v in weights.items()}
    return sc.ActivityConfig(activity_id=aid, weights=w)


def place(aid, *phases):
    return sc.Placement(activity_id=aid, phases=frozenset(Phase[p] for p in phases))


def test_perfect_score_all_primary():
    config = cfg(
        act("foundation", PLANNING=0, CONSTRUCTION=100, OPERATIONS=0),
        act("feasibility", PLANNING=100, CONSTRUCTION=0, OPERATIONS=0),
    )
    placements = [place("foundation", "CONSTRUCTION"), place("feasibility", "PLANNING")]
    result = sc.score(placements, config)
    assert result.score_percent == 100
    assert result.weakest_match is None


def test_worked_example_partial_credit():
    # "Permit Submission": Planning=70 (primary), Construction=30, Operations=0
    config = cfg(act("permit", PLANNING=70, CONSTRUCTION=30, OPERATIONS=0))
    # Placed only in Construction -> earned = min(70, 30) = 30
    result = sc.score([place("permit", "CONSTRUCTION")], config)
    assert result.total_earned == 30
    assert result.denominator == 70
    assert result.score_percent == 43  # round(30/70*100)


def test_multi_phase_capped_at_max():
    config = cfg(act("permit", PLANNING=70, CONSTRUCTION=30, OPERATIONS=0))
    # Placed in both Planning + Construction -> min(70, 70+30=100) = 70 (capped, full credit)
    result = sc.score([place("permit", "PLANNING", "CONSTRUCTION")], config)
    assert result.total_earned == 70
    assert result.score_percent == 100


def test_zero_weight_placement_no_penalty():
    config = cfg(
        act("a", PLANNING=100, CONSTRUCTION=0, OPERATIONS=0),
        act("b", PLANNING=0, CONSTRUCTION=100, OPERATIONS=0),
    )
    # 'a' placed correctly + also in a zero-weight phase: no penalty, still full credit.
    placements = [place("a", "PLANNING", "OPERATIONS"), place("b", "CONSTRUCTION")]
    result = sc.score(placements, config)
    assert result.score_percent == 100


def test_classification_correct_partial_incorrect():
    a = act("x", PLANNING=80, CONSTRUCTION=40, OPERATIONS=0)
    assert sc.classify(a.weight_for(Phase.PLANNING), a.max_weight()) == CardStatus.CORRECT
    assert sc.classify(a.weight_for(Phase.CONSTRUCTION), a.max_weight()) == CardStatus.PARTIAL
    assert sc.classify(a.weight_for(Phase.OPERATIONS), a.max_weight()) == CardStatus.INCORRECT


def test_weakest_match_largest_gap():
    config = cfg(
        act("low_gap", PLANNING=100, CONSTRUCTION=90, OPERATIONS=0),
        act("high_gap", PLANNING=100, CONSTRUCTION=0, OPERATIONS=0),
    )
    # low_gap placed in Construction (gap 10); high_gap placed in Construction (gap 100)
    placements = [place("low_gap", "CONSTRUCTION"), place("high_gap", "CONSTRUCTION")]
    result = sc.score(placements, config)
    assert result.weakest_match is not None
    assert result.weakest_match.activity_id == "high_gap"
    assert result.weakest_match.phase == Phase.CONSTRUCTION


def test_unplaced_activity_points_at_primary():
    config = cfg(act("missed", PLANNING=100, CONSTRUCTION=0, OPERATIONS=0))
    result = sc.score([], config)
    assert result.score_percent == 0
    assert result.weakest_match.activity_id == "missed"
    assert result.weakest_match.phase == Phase.PLANNING


def test_determinism():
    config = cfg(act("a", PLANNING=60, CONSTRUCTION=40, OPERATIONS=0))
    p = [place("a", "PLANNING")]
    assert sc.score(p, config) == sc.score(p, config)
