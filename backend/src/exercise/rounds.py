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


def is_sequence_round(rnd: dict) -> bool:
    return rnd.get("kind") == "SEQUENCE_ORDER"


def _student_position(round_placements: dict, card_id: str) -> int | None:
    """A sequence-round placement stores the chosen position as a single target
    of the form "pos-<n>" (1-based). Returns the int position, or None if unplaced."""
    targets = (round_placements or {}).get(card_id) or []
    for t in targets:
        s = str(t)
        if s.startswith("pos-"):
            try:
                return int(s[4:])
            except ValueError:
                return None
        try:
            return int(s)
        except ValueError:
            continue
    return None


def _score_sequence_round(rnd: dict, round_placements: dict) -> dict:
    """Distance-based partial-credit scoring for an ordering round.

    Each card has a correctPosition (1-based). Per-card credit =
    weight * (1 - |studentPos - correctPos| / (n-1)); unplaced = 0.
    Returns a round_results entry compatible with the match-round shape.
    """
    cards = rnd.get("cards", [])
    n = len(cards)
    max_distance = max(1, n - 1)
    per_card_weight = 100  # each stage worth 100; denominator = 100 * n

    total_earned = 0
    total_denominator = per_card_weight * n
    card_results = []
    worst = None  # (gap, cardId, correctPos)

    for c in cards:
        cid = c["cardId"]
        correct_pos = int(c.get("correctPosition", 0))
        student_pos = _student_position(round_placements, cid)
        if student_pos is None:
            earned = 0
            distance = max_distance
        else:
            distance = abs(student_pos - correct_pos)
            earned = round(per_card_weight * (1 - min(distance, max_distance) / max_distance))
        total_earned += earned
        gap = per_card_weight - earned

        card_results.append({
            "cardId": cid,
            # reuse the match-round shape: "placed target" = chosen position
            "placedTargets": [f"pos-{student_pos}"] if student_pos is not None else [],
            "perTarget": [{
                "target": f"pos-{student_pos}" if student_pos is not None else "pos-?",
                "status": ("CORRECT" if gap == 0 else "PARTIAL" if earned > 0 else "INCORRECT"),
                "weight": earned,
            }],
            "earned": earned,
            "max": per_card_weight,
            "correctPosition": correct_pos,
            "studentPosition": student_pos,
        })

        if gap > 0 and (worst is None or gap > worst[0]):
            worst = (gap, cid, correct_pos)

    score_percent = round(total_earned / total_denominator * 100) if total_denominator > 0 else 0
    weakest = None
    if worst is not None:
        weakest = {"cardId": worst[1], "target": f"pos-{worst[2]}", "gap": worst[0]}

    return {
        "roundId": rnd["roundId"],
        "title": rnd.get("title", rnd["roundId"]),
        "cardType": rnd.get("cardType"),
        "kind": rnd.get("kind"),
        "scorePercent": score_percent,
        "totalEarned": total_earned,
        "denominator": total_denominator,
        "cardResults": card_results,
        "weakest": weakest,
    }


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
        rp = placements.get(rnd["roundId"], {})

        if is_sequence_round(rnd):
            entry = _score_sequence_round(rnd, rp)
            round_results.append(entry)
            total_earned += entry["totalEarned"]
            total_denominator += entry["denominator"]
            w = entry.get("weakest")
            if w is not None and (global_weakest is None or w["gap"] > global_weakest["gap"]):
                global_weakest = w
                global_weakest_round = rnd["roundId"]
            continue

        cfg = _round_config(rnd)
        placed = _placements_for_round(rp)
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

        if result.weakest is not None:
            w = {"cardId": result.weakest.card_id, "target": result.weakest.target,
                 "gap": result.weakest.gap}
            if global_weakest is None or w["gap"] > global_weakest["gap"]:
                global_weakest = w
                global_weakest_round = rnd["roundId"]

    score_percent = round(total_earned / total_denominator * 100) if total_denominator > 0 else 0

    weakest_match = None
    if global_weakest is not None:
        weakest_match = {
            "roundId": global_weakest_round,
            "cardId": global_weakest["cardId"],
            "target": global_weakest["target"],
            "gap": global_weakest["gap"],
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
