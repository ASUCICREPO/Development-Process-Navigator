"""Tests for multi-round scoring and the five scenario seed templates."""
import pytest

from src.authoring.seed_templates import all_scenarios, build_scenario, SCENARIOS
from src.authoring.service import validate_configuration
from src.authoring import taxonomy as tx
from src.exercise import rounds


def _perfect_placements(snap):
    """For each round, place each card on its single highest-weight target."""
    placements = {}
    for r in snap["rounds"]:
        if not r["cards"]:
            continue
        best = {}
        for m in r["mappings"]:
            cid, tid, w = m["cardId"], m["targetId"], m["weight"]
            if cid not in best or w > best[cid][1]:
                best[cid] = (tid, w)
        placements[r["roundId"]] = {cid: [t] for cid, (t, w) in best.items()}
    return placements


# ---- Taxonomy completeness (matches the Instructor Manual) -----------------

def test_taxonomy_has_eight_stages():
    assert len(tx.PROCESS_STAGES) == 8


def test_taxonomy_has_fifteen_major_activities():
    assert len(tx.MAJOR_ACTIVITIES) == 15


def test_taxonomy_has_professionals_tasks_decisions():
    assert len(tx.PROFESSIONALS) >= 30
    assert len(tx.TASKS) == 15
    assert len(tx.DECISIONS) == 15


def test_every_activity_has_a_valid_primary_stage():
    stage_ids = {s[0] for s in tx.PROCESS_STAGES}
    for aid, _t, _d, pstage in tx.MAJOR_ACTIVITIES:
        assert pstage in stage_ids, f"{aid} -> {pstage}"


def test_professional_mappings_reference_real_activities():
    activity_ids = {a[0] for a in tx.MAJOR_ACTIVITIES}
    for pid, _t, _d, weights in tx.PROFESSIONALS:
        for aid in weights:
            assert aid in activity_ids, f"{pid} -> {aid}"


# ---- Scenarios -------------------------------------------------------------

def test_five_scenarios_exist():
    scs = all_scenarios()
    assert [s["scenarioId"] for s in scs] == ["A", "B", "C", "D", "E"]


def test_scenarios_have_four_rounds_and_validate():
    for snap in all_scenarios():
        # 4 rounds: place activities, professionals, tasks, decisions (last optional)
        assert len(snap["rounds"]) == 4
        assert snap["rounds"][-1].get("optional") is True
        validate_configuration(snap)


def test_optional_round_does_not_block_submission():
    from src.exercise import rounds as rmod
    snap = build_scenario("A")
    placed = {}
    for r in snap["rounds"]:
        if r.get("optional") or not r["cards"]:
            continue
        best = {}
        for m in r["mappings"]:
            cid, tid, w = m["cardId"], m["targetId"], m["weight"]
            if cid not in best or w > best[cid][1]:
                best[cid] = (tid, w)
        placed[r["roundId"]] = {cid: [t] for cid, (t, w) in best.items()}
    complete, missing = rmod.all_cards_placed(snap, placed)
    assert complete and missing == {}


def test_scenario_a_drops_vertical_activities():
    a = build_scenario("A")
    active_ids = {act["activityId"] for act in a["activities"]}
    # Design & Engineering and Construction Management are dropped in land speculation.
    assert "act-8" not in active_ids
    assert "act-11" not in active_ids


def test_scenario_b_keeps_all_activities():
    b = build_scenario("B")
    assert len(b["activities"]) == 15


# ---- Scoring ---------------------------------------------------------------

def test_perfect_placement_scores_100():
    snap = build_scenario("D")
    result = rounds.score_rounds(snap, _perfect_placements(snap))
    assert result["scorePercent"] == 100
    assert result["weakestMatch"] is None
    assert len(result["roundResults"]) == 4


def test_empty_placement_scores_zero_with_weakest():
    snap = build_scenario("E")
    result = rounds.score_rounds(snap, {})
    assert result["scorePercent"] == 0
    assert result["weakestMatch"] is not None


def test_all_cards_placed_detects_missing():
    snap = build_scenario("C")
    complete, missing = rounds.all_cards_placed(snap, {})
    assert not complete
    assert missing  # every round has missing cards


def test_all_cards_placed_true_when_complete():
    snap = build_scenario("C")
    complete, missing = rounds.all_cards_placed(snap, _perfect_placements(snap))
    assert complete
    assert missing == {}


def test_partial_round_credit():
    # Place only Round 1 perfectly, leave the rest empty -> score < 100 but > 0.
    snap = build_scenario("B")
    perfect = _perfect_placements(snap)
    only_r1 = {"r1": perfect["r1"]}
    result = rounds.score_rounds(snap, only_r1)
    assert 0 < result["scorePercent"] < 100
    # Round 1 itself is perfect.
    r1 = next(r for r in result["roundResults"] if r["roundId"] == "r1")
    assert r1["scorePercent"] == 100
