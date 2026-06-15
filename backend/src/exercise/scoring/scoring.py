"""Pure, deterministic scoring for ProcessCanvas (U3 / component C5).

No I/O, no side effects. Implements the algorithm from the U3 functional design:
- Q1=A earned/max ratio score
- Q2=A correctness classification (primary / non-primary positive / zero)
- Q3=A credit per correct phase, capped at the activity's max, no penalty
- Q4=A weakest match = largest (max - earned) gap (tie-break: higher max)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from ...shared.types import CardStatus, Phase


# ---- Inputs ---------------------------------------------------------------

@dataclass(frozen=True)
class ActivityConfig:
    """An activity's per-phase weights (0..100). Phases with no entry are weight 0."""

    activity_id: str
    weights: dict[Phase, int]

    def max_weight(self) -> int:
        return max(self.weights.values(), default=0)

    def primary_phase(self) -> Optional[Phase]:
        if not self.weights:
            return None
        best = max(self.weights.items(), key=lambda kv: kv[1])
        return best[0] if best[1] > 0 else None

    def weight_for(self, phase: Phase) -> int:
        return int(self.weights.get(phase, 0))


@dataclass(frozen=True)
class Configuration:
    activities: list[ActivityConfig]

    def by_id(self) -> dict[str, ActivityConfig]:
        return {a.activity_id: a for a in self.activities}

    def denominator(self) -> int:
        return sum(a.max_weight() for a in self.activities)


@dataclass(frozen=True)
class Placement:
    """Where the student placed an activity (may be multiple phases)."""

    activity_id: str
    phases: frozenset[Phase]


# ---- Outputs --------------------------------------------------------------

@dataclass(frozen=True)
class PhaseEvaluation:
    phase: Phase
    status: CardStatus
    weight: int


@dataclass(frozen=True)
class CardFeedback:
    activity_id: str
    placed_phases: frozenset[Phase]
    per_phase: list[PhaseEvaluation]
    earned: int
    max: int


@dataclass(frozen=True)
class WeakestMatch:
    activity_id: str
    phase: Phase
    gap: int


@dataclass(frozen=True)
class ScoreResult:
    score_percent: int
    total_earned: int
    denominator: int
    card_feedback: list[CardFeedback] = field(default_factory=list)
    weakest_match: Optional[WeakestMatch] = None


# ---- Algorithm ------------------------------------------------------------

def classify(weight: int, max_weight: int) -> CardStatus:
    """Q2=A: primary -> Correct, non-primary positive -> Partial, zero -> Incorrect."""
    if max_weight > 0 and weight == max_weight:
        return CardStatus.CORRECT
    if weight > 0:
        return CardStatus.PARTIAL
    return CardStatus.INCORRECT


def earned_for(activity: ActivityConfig, placed_phases: frozenset[Phase]) -> int:
    """Q3=A: sum of placed-phase weights, capped at the activity's max; no penalty."""
    total = sum(activity.weight_for(p) for p in placed_phases)
    return min(activity.max_weight(), total)


def score(placements: list[Placement], config: Configuration) -> ScoreResult:
    """Compute the alignment score, per-card feedback, and weakest match."""
    by_id = config.by_id()
    placement_map = {p.activity_id: p.phases for p in placements}

    total_earned = 0
    card_feedback: list[CardFeedback] = []
    weakest: Optional[WeakestMatch] = None

    for activity in config.activities:
        placed = placement_map.get(activity.activity_id, frozenset())
        earned = earned_for(activity, placed)
        total_earned += earned
        max_w = activity.max_weight()

        per_phase = [
            PhaseEvaluation(phase=ph, status=classify(activity.weight_for(ph), max_w),
                            weight=activity.weight_for(ph))
            for ph in sorted(placed, key=lambda p: p.value)
        ]
        card_feedback.append(CardFeedback(
            activity_id=activity.activity_id,
            placed_phases=placed,
            per_phase=per_phase,
            earned=earned,
            max=max_w,
        ))

        # Q4=A: weakest = largest gap; tie-break higher max.
        gap = max_w - earned
        if gap > 0:
            candidate_phase = _weakest_phase(activity, placed)
            if candidate_phase is not None and (
                weakest is None or gap > weakest.gap
                or (gap == weakest.gap and max_w > by_id[weakest.activity_id].max_weight())
            ):
                weakest = WeakestMatch(activity_id=activity.activity_id,
                                       phase=candidate_phase, gap=gap)

    denominator = config.denominator()
    score_percent = round(total_earned / denominator * 100) if denominator > 0 else 0

    return ScoreResult(
        score_percent=score_percent,
        total_earned=total_earned,
        denominator=denominator,
        card_feedback=card_feedback,
        weakest_match=weakest,
    )


def _weakest_phase(activity: ActivityConfig, placed: frozenset[Phase]) -> Optional[Phase]:
    """The placed phase with the lowest weight (the student's weakest placement).

    If the activity was not placed at all, point at its primary phase (the one they missed).
    """
    if placed:
        return min(placed, key=lambda p: (activity.weight_for(p), p.value))
    return activity.primary_phase()
