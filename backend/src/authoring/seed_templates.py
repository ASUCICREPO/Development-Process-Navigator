"""System-seeded real-estate-development template (derived from the ProcessCanvas prototype).

10 activities mapped across the three fixed phases with weights (primary phase = 100, with some
partial/secondary weights to enable partial credit).
"""
from __future__ import annotations

# (title, description, {phase: weight})
REAL_ESTATE_ACTIVITIES = [
    ("Site Feasibility Review",
     "Early review of whether the site can support the intended project",
     {"PLANNING": 100, "CONSTRUCTION": 0, "OPERATIONS": 0}),
    ("Zoning and Entitlement",
     "Securing approvals for land use density and permitted project scope",
     {"PLANNING": 100, "CONSTRUCTION": 0, "OPERATIONS": 0}),
    ("Architectural Drafting",
     "Creation of drawings and design documents for the project",
     {"PLANNING": 100, "CONSTRUCTION": 20, "OPERATIONS": 0}),
    ("Construction Budgeting",
     "Estimating project costs and aligning budget to scope",
     {"PLANNING": 80, "CONSTRUCTION": 40, "OPERATIONS": 0}),
    ("Permit Submission",
     "Submitting plans and documents for governmental approval",
     {"PLANNING": 70, "CONSTRUCTION": 30, "OPERATIONS": 0}),
    ("Foundation Pour",
     "Execution of the structural foundation work on site",
     {"PLANNING": 0, "CONSTRUCTION": 100, "OPERATIONS": 0}),
    ("Framing and Envelope",
     "Building the primary structure walls roof and enclosure",
     {"PLANNING": 0, "CONSTRUCTION": 100, "OPERATIONS": 0}),
    ("Final Inspection",
     "Inspection confirming that work meets code and can move toward closeout",
     {"PLANNING": 0, "CONSTRUCTION": 80, "OPERATIONS": 40}),
    ("Tenant Turnover Setup",
     "Preparing the building or unit for occupancy handoff and ongoing use",
     {"PLANNING": 0, "CONSTRUCTION": 20, "OPERATIONS": 100}),
    ("Property Maintenance Scheduling",
     "Planning recurring service and upkeep after occupancy",
     {"PLANNING": 0, "CONSTRUCTION": 0, "OPERATIONS": 100}),
]


def build_seed_template() -> dict:
    """Return a configuration snapshot dict for the seeded real-estate template."""
    activities = []
    mappings = []
    for idx, (title, desc, weights) in enumerate(REAL_ESTATE_ACTIVITIES):
        aid = f"act-{idx+1}"
        activities.append({"activityId": aid, "title": title, "description": desc})
        for phase, weight in weights.items():
            if weight > 0:
                mappings.append({"activityId": aid, "phase": phase, "weight": weight})
    return {
        "name": "Real Estate Development Process (Sample)",
        "phases": ["PLANNING", "CONSTRUCTION", "OPERATIONS"],
        "activities": activities,
        "mappings": mappings,
        "prompts": [],
    }
