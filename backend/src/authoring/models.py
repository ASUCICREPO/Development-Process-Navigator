"""U2 Authoring domain models."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from ..shared.types import Phase


@dataclass
class Activity:
    activity_id: str
    title: str
    description: str


@dataclass
class WeightedMapping:
    activity_id: str
    phase: Phase
    weight: int  # 0..100


@dataclass
class ReflectionPrompt:
    activity_id: str
    phase: Phase
    explanation: str
    reflection_prompt: str


@dataclass
class Configuration:
    config_id: str
    owner_instructor_id: str
    name: str
    activities: list[Activity] = field(default_factory=list)
    mappings: list[WeightedMapping] = field(default_factory=list)
    prompts: list[ReflectionPrompt] = field(default_factory=list)
    status: str = "Draft"  # Draft | Saved


@dataclass
class ConfigurationVersion:
    version_id: str
    config_id: str
    version_number: int
    snapshot: dict


@dataclass
class Template:
    template_id: str
    source: str  # SYSTEM_SEEDED | INSTRUCTOR_SAVED
    name: str
    snapshot: dict
    owner_instructor_id: Optional[str] = None
