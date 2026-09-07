"""System-seeded templates: the five scenarios from the Instructor Manual (§5, §9).

Each scenario is a full multi-round card-sort snapshot built from the canonical
taxonomy (taxonomy.py): 8 process stages, 15 major activities, ~30 professional
cards, task/deliverable cards, and decision cards, wired into 5 rounds.

Snapshot schema (superset of the legacy schema; legacy keys retained for
backward compatibility with the pre-existing single-sort scoring path):

{
  "name": str,
  "scenarioId": str,                 # "A".."E"
  "teachingFocus": str,
  "version": 2,                      # marks the multi-round schema
  "phases":  ["Concept & Acquisition", ...],        # stage TITLES (legacy shape)
  "stages":  [ {stageId, title, description, order} ],
  "activities": [ {activityId, title, description, cardType, primaryStage} ],
  "cards":   [ {cardId, cardType, title, description} ],   # process/professional/task/decision cards
  "rounds":  [ {roundId, order, kind, cardType, title, instructions,
                targetKind, targets:[{id,label}],
                mappings:[{cardId, targetId, weight}]} ],
  "costCategories": [...],
  # ---- legacy keys (Round 2 projection) so old scoring/UI still works ----
  "mappings": [ {activityId, phase, weight} ],
  "prompts":  [ {activityId, phase, text} ],
}
"""
from __future__ import annotations

from . import taxonomy as tx


# ---------------------------------------------------------------------------
# Scenario definitions (manual §5 recommended scenarios, §9 instructor notes).
# `activity_scale` overrides the emphasis of specific activities for a scenario:
#   1.0 = normal, 0.0 = not applicable/absent, values <1 reduce, >1 emphasize.
# Activities not listed default to 1.0.
# ---------------------------------------------------------------------------
SCENARIOS = {
    "A": {
        "name": "Scenario A — Land Speculation",
        "teachingFocus": ("Acquire a parcel, hold for appreciation or future opportunity, "
                          "and sell without full vertical development."),
        # Design, construction, commissioning, operations limited or absent.
        "activity_scale": {
            "act-6": 0.3, "act-8": 0.0, "act-10": 0.0, "act-11": 0.0,
            "act-12": 0.2, "act-13": 0.0, "act-14": 0.2,
            "act-1": 1.3, "act-2": 1.3, "act-4": 1.2, "act-15": 1.3,
        },
    },
    "B": {
        "name": "Scenario B — Master-Planned Community",
        "teachingFocus": ("Acquire a large parcel and undertake planning, infrastructure, "
                          "entitlements, phasing, and long-term community development."),
        "activity_scale": {
            "act-6": 1.3, "act-7": 1.3, "act-8": 1.2, "act-11": 1.2, "act-15": 1.2,
        },
    },
    "C": {
        "name": "Scenario C — Finished Lots to Homebuilders",
        "teachingFocus": ("Acquire land, entitle and improve it, then sell finished lots "
                          "to one or more homebuilders."),
        # Vertical architect/MEP roles reduced (homebuilders control home design).
        "activity_scale": {
            "act-7": 1.3, "act-8": 0.6, "act-11": 1.1, "act-12": 1.1, "act-14": 0.4,
        },
    },
    "D": {
        "name": "Scenario D — Multi-Tenant Retail",
        "teachingFocus": ("Develop a multi-tenant retail project requiring tenant strategy, "
                          "leasing, design, construction, and operations."),
        "activity_scale": {
            "act-12": 1.3, "act-8": 1.1, "act-11": 1.1, "act-14": 1.2,
        },
    },
    "E": {
        "name": "Scenario E — Residential Condominium",
        "teachingFocus": ("Develop for-sale residential condominium units, integrating design, "
                          "construction, unit sales, closeout, and association considerations."),
        "activity_scale": {
            "act-12": 1.3, "act-8": 1.1, "act-13": 1.2, "act-14": 1.1,
        },
    },
}


def _clamp(w: int) -> int:
    return max(0, min(100, int(round(w))))


def _active_activities(activity_scale: dict) -> list[tuple]:
    """Major activities present in a scenario (scale > 0)."""
    return [a for a in tx.MAJOR_ACTIVITIES if activity_scale.get(a[0], 1.0) > 0]


def _build_round_mappings(cards, activity_scale, active_ids):
    """Scale each card's activity weights by the scenario, dropping absent activities."""
    mappings = []
    for card in cards:
        cid, weights = card[0], card[-1]
        for aid, w in weights.items():
            if aid not in active_ids:
                continue
            scaled = _clamp(w * activity_scale.get(aid, 1.0))
            if scaled > 0:
                mappings.append({"cardId": cid, "targetId": aid, "weight": scaled})
    return mappings


def build_scenario(scenario_id: str) -> dict:
    """Build a full multi-round snapshot for one scenario ('A'..'E')."""
    sc = SCENARIOS[scenario_id]
    scale = sc["activity_scale"]

    active = _active_activities(scale)
    active_ids = {a[0] for a in active}

    # --- Stages ---
    stages = [{"stageId": sid, "title": title, "description": desc, "order": i + 1}
              for i, (sid, title, desc) in enumerate(tx.PROCESS_STAGES)]
    stage_targets = [{"id": s["stageId"], "label": s["title"]} for s in stages]

    # --- Activities (as cards + as the canonical activity list) ---
    activities = [{"activityId": aid, "title": title, "description": desc,
                   "cardType": "MAJOR_ACTIVITY", "primaryStage": pstage}
                  for (aid, title, desc, pstage) in active]
    activity_targets = [{"id": a["activityId"], "label": a["title"]} for a in activities]

    # --- Process cards (Round 1: sequence the 8 stages) ---
    process_cards = [{"cardId": f"proc-{sid}", "cardType": "PROCESS",
                      "title": title, "description": desc}
                     for (sid, title, desc) in tx.PROCESS_STAGES]
    process_mappings = [{"cardId": f"proc-{sid}", "targetId": sid, "weight": 100}
                        for (sid, _t, _d) in tx.PROCESS_STAGES]

    # --- Round 2: place major activities onto stages ---
    activity_stage_mappings = [
        {"cardId": aid, "targetId": pstage, "weight": 100}
        for (aid, _t, _d, pstage) in active
    ]

    # --- Professional / Task / Decision cards (Rounds 3-5, match to activities) ---
    professional_cards = [{"cardId": p[0], "cardType": "PROFESSIONAL",
                           "title": p[1], "description": p[2]} for p in tx.PROFESSIONALS]
    task_cards = [{"cardId": t[0], "cardType": "TASK_DELIVERABLE",
                   "title": t[1], "description": t[2]} for t in tx.TASKS]
    decision_cards = [{"cardId": d[0], "cardType": "DECISION",
                       "title": d[1], "description": ""} for d in tx.DECISIONS]

    professional_mappings = _build_round_mappings(tx.PROFESSIONALS, scale, active_ids)
    task_mappings = _build_round_mappings(tx.TASKS, scale, active_ids)
    decision_mappings = _build_round_mappings(tx.DECISIONS, scale, active_ids)

    # Keep only cards that still have at least one mapping (some drop out in Scenario A).
    def _keep(cards, mappings):
        used = {m["cardId"] for m in mappings}
        return [c for c in cards if c["cardId"] in used]

    professional_cards = _keep(professional_cards, professional_mappings)
    task_cards = _keep(task_cards, task_mappings)
    decision_cards = _keep(decision_cards, decision_mappings)

    # Round 1 is "place the major activities onto the process stages". (A separate
    # stage-ordering round was dropped because matching a stage card into the
    # identically-named column gave away the answer and taught nothing.)
    rounds = [
        {"roundId": "r1", "order": 1, "kind": "SEQUENCE_PHASES", "cardType": "MAJOR_ACTIVITY",
         "title": "Round 1 — Place the Major Activities",
         "instructions": "Place each major activity onto the process stage where it primarily belongs.",
         "targetKind": "STAGE", "targets": stage_targets,
         "cards": [{"cardId": a["activityId"], "cardType": "MAJOR_ACTIVITY",
                    "title": a["title"], "description": a["description"]} for a in activities],
         "mappings": activity_stage_mappings},
        {"roundId": "r2", "order": 2, "kind": "MATCH_TO_ACTIVITY", "cardType": "PROFESSIONAL",
         "title": "Round 2 — Match the Professionals",
         "instructions": "Match each professional to the major activity/activities they contribute to.",
         "targetKind": "ACTIVITY", "targets": activity_targets,
         "cards": professional_cards, "mappings": professional_mappings},
        {"roundId": "r3", "order": 3, "kind": "MATCH_TO_ACTIVITY", "cardType": "TASK_DELIVERABLE",
         "title": "Round 3 — Match Tasks & Deliverables",
         "instructions": "Match each task/deliverable to the activity it belongs to.",
         "targetKind": "ACTIVITY", "targets": activity_targets,
         "cards": task_cards, "mappings": task_mappings},
        {"roundId": "r4", "order": 4, "kind": "MATCH_TO_ACTIVITY", "cardType": "DECISION",
         "title": "Round 4 — Developer Decisions (optional)",
         "instructions": "Match each developer go/no-go decision to the activity it follows.",
         "targetKind": "ACTIVITY", "targets": activity_targets, "optional": True,
         "cards": decision_cards, "mappings": decision_mappings},
    ]

    # --- Legacy projection (single-sort path): activities -> stages ---
    legacy_phases = [s["title"] for s in stages]
    stage_title = {s["stageId"]: s["title"] for s in stages}
    legacy_mappings = [{"activityId": aid, "phase": stage_title[pstage], "weight": 100}
                       for (aid, _t, _d, pstage) in active]

    return {
        "name": sc["name"],
        "scenarioId": scenario_id,
        "teachingFocus": sc["teachingFocus"],
        "version": 2,
        "phases": legacy_phases,
        "stages": stages,
        "activities": activities,
        "processCards": process_cards,
        "professionalCards": professional_cards,
        "taskCards": task_cards,
        "decisionCards": decision_cards,
        "rounds": rounds,
        "costCategories": tx.COST_CATEGORIES,
        # legacy keys
        "mappings": legacy_mappings,
        "prompts": [],
    }


def all_scenarios() -> list[dict]:
    """All five scenario snapshots, in A..E order."""
    return [build_scenario(sid) for sid in ("A", "B", "C", "D", "E")]


def build_seed_template() -> dict:
    """Backward-compatible default seed (Scenario A)."""
    return build_scenario("A")
