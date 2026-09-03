"""Pure, deterministic scoring for ProcessCanvas (U3 / component C5).

No I/O, no side effects.

Two layers:

1. A GENERIC string-target core (`score_targets`) that scores a set of cards, each
   carrying weights over arbitrary string "targets". Targets are process-stage names
   in Rounds 1-2 (sequence-into-phases) and major-activity ids in Rounds 3-5
   (match-card-to-activity). This is what the multi-round exercise from the
   Instructor Manual uses.

2. A backward-compatible `Phase`-typed wrapper (`score`) preserving the original
   single-sort algorithm and its public dataclasses (used by existing callers/tests):
   - Q1=A earned/max ratio score
   - Q2=A correctness classification (primary / non-primary positive / zero)
   - Q3=A credit per correct target, capped at the card's max, no penalty
   - Q4=A weakest match = largest (max - earned) gap (tie-break: higher max)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from ...shared.types import CardStatus, Phase


# ===========================================================================
# GENERIC STRING-TARGET CORE
# ===========================================================================

@dataclass(frozen=True)
class CardConfig:
    """A card's per-target weights (0..100). Targets with no entry are weight 0."""

    card_id: str
    weights: dict[str, int]

    def max_weight(self) -> int:
        return max(self.weights.values(), default=0)

    def primary_target(self) -> Optional[str]:
        if not self.weights:
            return None
        best = max(self.weights.items(), key=lambda kv: (kv[1], kv[0]))
        return best[0] if best[1] > 0 else None

    def weight_for(self, target: str) -> int:
        return int(self.weights.get(target, 0))


@dataclass(frozen=True)
class RoundConfig:
    """A single round: the cards to place and how they are scored."""

    cards: list[CardConfig]

    def by_id(self) -> dict[str, CardConfig]:
        return {c.card_id: c for c in self.cards}

    def denominator(self) -> int:
        return sum(c.max_weight() for c in self.cards)


@dataclass(frozen=True)
class CardPlacement:
    """Where the student placed a card (may be multiple targets)."""

    card_id: str
    targets: frozenset[str]


@dataclass(frozen=True)
class TargetEvaluation:
    target: str
    status: CardStatus
    weight: int


@dataclass(frozen=True)
class CardResult:
    card_id: str
    placed_targets: frozenset[str]
    per_target: list[TargetEvaluation]
    earned: int
    max: int


@dataclass(frozen=True)
class WeakestCard:
    card_id: str
    target: str
    gap: int


@dataclass(frozen=True)
class RoundResult:
    score_percent: int
    total_earned: int
    denominator: int
    card_results: list[CardResult] = field(default_factory=list)
    weakest: Optional[WeakestCard] = None


def classify(weight: int, max_weight: int) -> CardStatus:
    """primary -> Correct, non-primary positive -> Partial, zero -> Incorrect."""
    if max_weight > 0 and weight == max_weight:
        return CardStatus.CORRECT
    if weight > 0:
        return CardStatus.PARTIAL
    return CardStatus.INCORRECT


def _earned_for(card: CardConfig, placed: frozenset[str]) -> int:
    """Sum of placed-target weights, capped at the card's max; no penalty."""
    total = sum(card.weight_for(t) for t in placed)
    return min(card.max_weight(), total)


def _weakest_target(card: CardConfig, placed: frozenset[str]) -> Optional[str]:
    """The placed target with the lowest weight (weakest placement).

    If the card was not placed at all, point at its primary target (the one missed).
    """
    if placed:
        return min(placed, key=lambda t: (card.weight_for(t), t))
    return card.primary_target()


def score_targets(placements: list[CardPlacement], rnd: RoundConfig) -> RoundResult:
    """Score one round of card->target placements."""
    by_id = rnd.by_id()
    placement_map = {p.card_id: p.targets for p in placements}

    total_earned = 0
    card_results: list[CardResult] = []
    weakest: Optional[WeakestCard] = None

    for card in rnd.cards:
        placed = placement_map.get(card.card_id, frozenset())
        earned = _earned_for(card, placed)
        total_earned += earned
        max_w = card.max_weight()

        per_target = [
            TargetEvaluation(target=t, status=classify(card.weight_for(t), max_w),
                             weight=card.weight_for(t))
            for t in sorted(placed)
        ]
        card_results.append(CardResult(
            card_id=card.card_id, placed_targets=placed, per_target=per_target,
            earned=earned, max=max_w,
        ))

        gap = max_w - earned
        if gap > 0:
            candidate = _weakest_target(card, placed)
            if candidate is not None and (
                weakest is None or gap > weakest.gap
                or (gap == weakest.gap and max_w > by_id[weakest.card_id].max_weight())
            ):
                weakest = WeakestCard(card_id=card.card_id, target=candidate, gap=gap)

    denominator = rnd.denominator()
    score_percent = round(total_earned / denominator * 100) if denominator > 0 else 0
    return RoundResult(
        score_percent=score_percent, total_earned=total_earned,
        denominator=denominator, card_results=card_results, weakest=weakest,
    )


# ===========================================================================
# BACKWARD-COMPATIBLE Phase-TYPED WRAPPER
# ===========================================================================

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


def earned_for(activity: ActivityConfig, placed_phases: frozenset[Phase]) -> int:
    """Sum of placed-phase weights, capped at the activity's max; no penalty."""
    total = sum(activity.weight_for(p) for p in placed_phases)
    return min(activity.max_weight(), total)


def score(placements: list[Placement], config: Configuration) -> ScoreResult:
    """Compute the alignment score, per-card feedback, and weakest match (Phase-typed)."""
    # Delegate to the generic core, then map results back to Phase-typed dataclasses.
    rnd = RoundConfig(cards=[
        CardConfig(a.activity_id, {p.value: w for p, w in a.weights.items()})
        for a in config.activities
    ])
    generic = score_targets(
        [CardPlacement(p.activity_id, frozenset(ph.value for ph in p.phases))
         for p in placements],
        rnd,
    )

    def _phase(v: str) -> Phase:
        return Phase(v)

    card_feedback = [
        CardFeedback(
            activity_id=cr.card_id,
            placed_phases=frozenset(_phase(t) for t in cr.placed_targets),
            per_phase=[PhaseEvaluation(_phase(te.target), te.status, te.weight)
                       for te in cr.per_target],
            earned=cr.earned, max=cr.max,
        )
        for cr in generic.card_results
    ]
    weakest = (
        WeakestMatch(generic.weakest.card_id, _phase(generic.weakest.target), generic.weakest.gap)
        if generic.weakest else None
    )
    return ScoreResult(
        score_percent=generic.score_percent, total_earned=generic.total_earned,
        denominator=generic.denominator, card_feedback=card_feedback, weakest_match=weakest,
    )
