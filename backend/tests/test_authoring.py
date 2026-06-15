"""Unit tests for U2 Authoring validation and seed template."""
import pytest

from src.authoring.service import validate_configuration
from src.authoring.seed_templates import build_seed_template
from src.shared.errors import ValidationError


def test_seed_template_has_ten_activities():
    snap = build_seed_template()
    assert len(snap["activities"]) == 10
    # every activity referenced in mappings has at least one positive weight
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
