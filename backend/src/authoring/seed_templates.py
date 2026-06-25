"""System-seeded real-estate-development template.

26 activities across 5 phases, derived from the MRED Note Card Exercise and Value Web framework.
Each activity is tagged with a roleType (People, Task, or Test) and mapped to one or more phases
with alignment weights (primary = 100, secondary/partial for cross-phase relevance).
"""
from __future__ import annotations

# Phases representing the real-estate development continuum
PHASES = [
    "Pre-Development",
    "Due Diligence",
    "Concept & Analysis",
    "Implementation / Build",
    "Operations & Mgmt",
]

# (title, description, roleType, {phase: weight})
REAL_ESTATE_ACTIVITIES = [
    # --- People (Professionals) ---
    ("Real Estate Attorney",
     "Legal counsel for contracts, title review, entitlements, and closing",
     "People",
     {"Pre-Development": 100, "Due Diligence": 80, "Concept & Analysis": 20}),

    ("Environmental Consultant",
     "Conducts Phase I/II environmental site assessments and remediation planning",
     "People",
     {"Pre-Development": 60, "Due Diligence": 100}),

    ("Architect",
     "Designs the project including schematic design, design development, and construction documents",
     "People",
     {"Concept & Analysis": 100, "Implementation / Build": 40}),

    ("Civil Engineer",
     "Site engineering including grading, drainage, utilities, and roadway design",
     "People",
     {"Due Diligence": 40, "Concept & Analysis": 100, "Implementation / Build": 60}),

    ("General Contractor",
     "Manages construction execution, subcontractors, schedule, and quality",
     "People",
     {"Implementation / Build": 100}),

    ("Property Manager",
     "Oversees building operations, tenant relations, maintenance, and financial reporting",
     "People",
     {"Operations & Mgmt": 100}),

    ("Market Analyst",
     "Conducts market research, demand analysis, and competitive positioning studies",
     "People",
     {"Pre-Development": 100, "Concept & Analysis": 40}),

    ("Heritage Consultant",
     "Assesses historical/cultural significance and compliance with preservation requirements",
     "People",
     {"Pre-Development": 40, "Due Diligence": 100}),

    ("Appraiser",
     "Determines property valuation for acquisition, lending, and disposition purposes",
     "People",
     {"Pre-Development": 80, "Due Diligence": 60, "Operations & Mgmt": 40}),

    ("Surveyor",
     "Performs boundary, topographic, and ALTA surveys for site documentation",
     "People",
     {"Pre-Development": 60, "Due Diligence": 100}),

    ("Leasing Agent",
     "Markets available space, negotiates leases, and manages tenant procurement",
     "People",
     {"Concept & Analysis": 20, "Implementation / Build": 40, "Operations & Mgmt": 100}),

    ("Lender / Capital Partner",
     "Provides construction and permanent financing for the project",
     "People",
     {"Concept & Analysis": 60, "Implementation / Build": 100}),

    # --- Tasks ---
    ("Site Selection",
     "Identifying and evaluating potential development sites based on project criteria",
     "Task",
     {"Pre-Development": 100}),

    ("Title Search",
     "Examining public records to verify clear ownership and identify encumbrances",
     "Task",
     {"Pre-Development": 80, "Due Diligence": 100}),

    ("Zoning Application",
     "Submitting applications for rezoning, variances, or conditional use permits",
     "Task",
     {"Pre-Development": 100, "Due Diligence": 40}),

    ("Financial Pro Forma",
     "Developing projected income, expenses, returns, and capital structure for the project",
     "Task",
     {"Concept & Analysis": 100, "Pre-Development": 40}),

    ("Building Permit Filing",
     "Submitting construction documents to authorities for building permit approval",
     "Task",
     {"Concept & Analysis": 40, "Implementation / Build": 100}),

    ("Site Grading & Prep",
     "Earthwork, clearing, and grading to prepare the site for construction",
     "Task",
     {"Implementation / Build": 100}),

    ("Building Inspection",
     "Mandatory inspections during construction to verify code compliance",
     "Task",
     {"Implementation / Build": 100, "Operations & Mgmt": 20}),

    ("Certificate of Occupancy",
     "Final governmental approval confirming the building is safe for occupancy",
     "Task",
     {"Implementation / Build": 60, "Operations & Mgmt": 100}),

    ("Lease Negotiation",
     "Drafting and executing lease agreements with tenants",
     "Task",
     {"Implementation / Build": 20, "Operations & Mgmt": 100}),

    # --- Tests (Analytical/Assessment Activities) ---
    ("Phase I Environmental Assessment",
     "Initial environmental review to identify potential contamination or hazards",
     "Test",
     {"Due Diligence": 100}),

    ("Traffic Impact Study",
     "Analysis of how the project will affect local traffic patterns and infrastructure",
     "Test",
     {"Due Diligence": 100, "Concept & Analysis": 40}),

    ("Feasibility Study",
     "Comprehensive analysis of market, financial, and physical viability of the project",
     "Test",
     {"Pre-Development": 60, "Concept & Analysis": 100}),

    ("Geotechnical Report",
     "Subsurface soil and groundwater investigation to inform foundation design",
     "Test",
     {"Due Diligence": 100, "Concept & Analysis": 40}),

    ("Structural Load Testing",
     "Engineering tests to verify building structural integrity during/after construction",
     "Test",
     {"Implementation / Build": 100}),
]


def build_seed_template() -> dict:
    """Return a configuration snapshot dict for the seeded real-estate template."""
    activities = []
    mappings = []
    for idx, (title, desc, role_type, weights) in enumerate(REAL_ESTATE_ACTIVITIES):
        aid = f"act-{idx + 1}"
        activities.append({
            "activityId": aid,
            "title": title,
            "description": desc,
            "roleType": role_type,
        })
        for phase, weight in weights.items():
            if weight > 0:
                mappings.append({"activityId": aid, "phase": phase, "weight": weight})
    return {
        "name": "Real Estate Development Process",
        "phases": PHASES,
        "activities": activities,
        "mappings": mappings,
        "prompts": [
            {"activityId": "act-1", "phase": "Concept & Analysis",
             "text": "Consider at what stage legal review is most critical — is it before or after design begins?"},
            {"activityId": "act-8", "phase": "Implementation / Build",
             "text": "Heritage considerations typically arise before construction. What stage requires cultural surveys?"},
            {"activityId": "act-22", "phase": "Pre-Development",
             "text": "Traffic studies inform entitlement decisions. At what stage do municipalities require this?"},
        ],
    }
