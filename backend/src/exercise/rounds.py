"""Multi-round exercise scoring (pure, no I/O).

Scores a v2 (multi-round) snapshot against a student's per-round placements.
Each round is scored independently with the generic string-target core in
`scoring.score_targets`; the exercise score is the weighted aggregate across
playable rounds (weighted by each round's denominator so every card counts once).

Student placements shape:
    { roundId: { cardId: [targetId, ...] } }

Returns a dict (JSON-serializable) suitable for storing on an Attempt and
returning to the frontend.
"""
from __future__ import annotations

from .scoring import scoring as sc


def is_multi_round(snapshot: dict) -> bool:
    return bool(snapshot.get("rounds"))


def playable_rounds(snapshot: dict) -> list[dict]:
    """Rounds that have at least one card (optional rounds with no cards are skipped)."""
    return [r for r in snapshot.get("rounds", []) if r.get("cards")]


def _round_config(rnd: dict) -> sc.RoundConfig:
    weights: dict[str, dict[str, int]] = {}
    for m in rnd.get("mappings", []):
        weights.setdefault(m["cardId"], {})[m["targetId"]] = int(m["weight"])
    cards = [sc.CardConfig(c["cardId"], weights.get(c["cardId"], {}))
             for c in rnd.get("cards", [])]
    return sc.RoundConfig(cards=cards)


def _placements_for_round(round_placements: dict) -> list[sc.CardPlacement]:
    return [sc.CardPlacement(card_id=cid, targets=frozenset(targets or []))
            for cid, targets in (round_placements or {}).items()]


def score_rounds(snapshot: dict, placements: dict) -> dict:
    """Score every playable round and aggregate into an exercise result.

    `placements` = { roundId: { cardId: [targetId,...] } }
    """
    round_results = []
    total_earned = 0
    total_denominator = 0
    # Track the single largest gap across all rounds for the reflection prompt.
    global_weakest = None
    global_weakest_round = None

    for rnd in playable_rounds(snapshot):
        cfg = _round_config(rnd)
        placed = _placements_for_round(placements.get(rnd["roundId"], {}))
        result = sc.score_targets(placed, cfg)

        total_earned += result.total_earned
        total_denominator += result.denominator

        round_results.append({
            "roundId": rnd["roundId"],
            "title": rnd.get("title", rnd["roundId"]),
            "cardType": rnd.get("cardType"),
            "kind": rnd.get("kind"),
            "scorePercent": result.score_percent,
            "totalEarned": result.total_earned,
            "denominator": result.denominator,
            "cardResults": [
                {
                    "cardId": cr.card_id,
                    "placedTargets": sorted(cr.placed_targets),
                    "perTarget": [
                        {"target": te.target, "status": te.status.value, "weight": te.weight}
                        for te in cr.per_target
                    ],
                    "earned": cr.earned,
                    "max": cr.max,
                }
                for cr in result.card_results
            ],
            "weakest": (
                {"cardId": result.weakest.card_id, "target": result.weakest.target,
                 "gap": result.weakest.gap}
                if result.weakest else None
            ),
        })

        if result.weakest is not None and (
            global_weakest is None or result.weakest.gap > global_weakest.gap
        ):
            global_weakest = result.weakest
            global_weakest_round = rnd["roundId"]

    score_percent = round(total_earned / total_denominator * 100) if total_denominator > 0 else 0

    weakest_match = None
    if global_weakest is not None:
        weakest_match = {
            "roundId": global_weakest_round,
            "cardId": global_weakest.card_id,
            "target": global_weakest.target,
            "gap": global_weakest.gap,
        }

    return {
        "scorePercent": score_percent,
        "totalEarned": total_earned,
        "denominator": total_denominator,
        "roundResults": round_results,
        "weakestMatch": weakest_match,
    }


def all_cards_placed(snapshot: dict, placements: dict) -> tuple[bool, dict]:
    """Check every card in every REQUIRED round has at least one target.

    Optional rounds (rnd["optional"] is True) never block submission — a student
    may skip them entirely. Returns (complete, {roundId: [missing cardIds]}).
    """
    missing: dict[str, list[str]] = {}
    for rnd in playable_rounds(snapshot):
        if rnd.get("optional"):
            continue  # optional rounds are never required
        rp = placements.get(rnd["roundId"], {})
        gaps = [c["cardId"] for c in rnd["cards"] if not rp.get(c["cardId"])]
        if gaps:
            missing[rnd["roundId"]] = gaps
    return (len(missing) == 0, missing)
