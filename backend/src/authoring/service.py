"""U2 Authoring service: configuration CRUD, validation, apply→version, templates."""
from __future__ import annotations

import uuid
from typing import Callable

from ..shared.errors import ValidationError
from .models import Configuration, ConfigurationVersion, Template
from .seed_templates import build_seed_template


def validate_configuration(snapshot: dict) -> None:
    """BR-4.1: >=1 activity and every activity has >=1 mapping with weight > 0."""
    activities = snapshot.get("activities", [])
    mappings = snapshot.get("mappings", [])
    if not activities:
        raise ValidationError("Configuration must have at least one activity.")
    weighted = {m["activityId"] for m in mappings if m.get("weight", 0) > 0}
    missing = [a["activityId"] for a in activities if a["activityId"] not in weighted]
    if missing:
        raise ValidationError(f"Every activity needs a phase weight > 0. Missing: {missing}")


class AuthoringService:
    def __init__(self, configs, versions, templates,
                 create_exercise: Callable[[str, str], str]):
        self._configs = configs        # repo: get, save
        self._versions = versions      # repo: save, latest_number
        self._templates = templates    # repo: list_for, get, save
        self._create_exercise = create_exercise  # (config_id, version_id) -> exercise_id

    def list_templates(self, instructor_id: str) -> list[Template]:
        return self._templates.list_for(instructor_id)

    def create_from_template(self, instructor_id: str, name: str,
                             template_id: str | None = None) -> Configuration:
        if template_id:
            tmpl = self._templates.get(template_id)
            if not tmpl:
                raise ValidationError("Template not found.")
            snap = dict(tmpl.snapshot)
        else:
            snap = {"activities": [], "mappings": [], "prompts": [],
                    "phases": ["PLANNING", "CONSTRUCTION", "OPERATIONS"]}
        cfg = Configuration(str(uuid.uuid4()), instructor_id, name)
        cfg.status = "Draft"
        self._configs.save(cfg, snapshot=snap)
        return cfg

    def save_configuration(self, config_id: str) -> None:
        cfg = self._configs.get(config_id)
        cfg.status = "Saved"
        self._configs.save(cfg)

    def save_as_template(self, instructor_id: str, config_id: str, name: str) -> Template:
        snap = self._configs.snapshot(config_id)
        tmpl = Template(str(uuid.uuid4()), "INSTRUCTOR_SAVED", name, snap, instructor_id)
        self._templates.save(tmpl)
        return tmpl

    def apply(self, config_id: str) -> dict:
        snap = self._configs.snapshot(config_id)
        validate_configuration(snap)
        number = self._versions.latest_number(config_id) + 1
        version = ConfigurationVersion(str(uuid.uuid4()), config_id, number, snap)
        self._versions.save(version)
        exercise_id = self._create_exercise(config_id, version.version_id)
        return {"exerciseId": exercise_id, "versionId": version.version_id,
                "versionNumber": number}

    @staticmethod
    def seed_template() -> dict:
        return build_seed_template()
