"""Unit tests for U2 Authoring validation and seed template."""
import pytest

from src.authoring.service import validate_configuration
from src.authoring.seed_templates import build_seed_template
from src.shared.errors import ValidationError


def test_seed_template_is_multi_round_scenario():
    snap = build_seed_template()  # Scenario A
    assert snap["version"] == 2
    assert snap["scenarioId"] == "A"
    assert len(snap["stages"]) == 8
    # Scenario A drops vertical development, so fewer than the full 15 activities.
    assert 0 < len(snap["activities"]) < 15
    assert len(snap["rounds"]) == 5
    # legacy projection: every active activity has a positive legacy mapping
    weighted = {m["activityId"] for m in snap["mappings"] if m["weight"] > 0}
    assert {a["activityId"] for a in snap["activities"]} == weighted


def test_seed_template_passes_validation():
    validate_configuration(build_seed_template())  # should not raise


def test_validation_requires_activities():
    with pytest.raises(ValidationError):
        validate_configuration({"activities": [], "mappings": []})


def test_validation_requires_every_activity_weighted():
    snap = {
        "activities": [{"activityId": "a", "title": "A", "description": ""},
                       {"activityId": "b", "title": "B", "description": ""}],
        "mappings": [{"activityId": "a", "phase": "PLANNING", "weight": 100}],
    }
    with pytest.raises(ValidationError):
        validate_configuration(snap)
