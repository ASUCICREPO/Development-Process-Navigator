"""Canonical Real Estate Development taxonomy from the Instructor Manual.

Source: "Instructor Manual — Real Estate Development Process Digital Card-Sorting
Exercise" (§3 eight process stages & fifteen major activities, §4 professionals,
§11 instructor reference matrix). This module is pure data + builders; no I/O.

The exercise is modeled as a set of typed CARDS placed onto TARGETS:
  - Round 1 (PROCESS cards)          -> sequenced into the process timeline (targets = stage ids)
  - Round 2 (MAJOR_ACTIVITY cards)   -> placed onto process stages       (targets = stage ids)
  - Round 3 (PROFESSIONAL cards)     -> matched to major activities       (targets = activity ids)
  - Round 4 (TASK_DELIVERABLE cards) -> matched to major activities       (targets = activity ids)
  - Round 5 (DECISION cards)         -> matched to major activities       (targets = activity ids)
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# 1. The eight PROCESS STAGES (manual §3). Ordered. `stageId` is stable.
# ---------------------------------------------------------------------------
PROCESS_STAGES = [
    ("stage-1", "Concept & Acquisition",
     "Site selection, negotiation, property control, and acquisition."),
    ("stage-2", "Pre-Development Due Diligence & Planning",
     "Acquisition due diligence, project planning, feasibility, and early risk identification."),
    ("stage-3", "Design",
     "Site and/or building design, moving from concept toward coordinated technical documents."),
    ("stage-4", "Entitlements & Jurisdictional Approvals",
     "Zoning, permits, public approvals, agency review, and conditions to build and occupy."),
    ("stage-5", "Financing",
     "Equity and debt for acquisition, predevelopment, construction, and permanent financing."),
    ("stage-6", "Development/Construction",
     "Construction of physical assets and management of cost, schedule, quality, safety."),
    ("stage-7", "Sales/Leasing",
     "Revenue strategy: marketing, leasing, lot/unit sales, or other disposition activity."),
    ("stage-8", "Operations/Property Management",
     "Operation of the property or association and ongoing physical/financial performance."),
]

# ---------------------------------------------------------------------------
# 2. The fifteen MAJOR ACTIVITIES (manual §3). Ordered. `activityId` is stable.
#    primary_stage links each activity to its home process stage.
# ---------------------------------------------------------------------------
MAJOR_ACTIVITIES = [
    ("act-1", "Market Analysis & Development Concept",
     "What market opportunity is being pursued, for whom, and with what initial thesis?", "stage-1"),
    ("act-2", "Site Identification & Acquisition Strategy",
     "Which site fits the thesis, and how should it be controlled or acquired?", "stage-1"),
    ("act-3", "Preliminary Feasibility & Underwriting",
     "Can the concept meet financial and investment objectives under reasonable assumptions?", "stage-2"),
    ("act-4", "Site Due Diligence",
     "What legal, physical, environmental, infrastructure constraints could change the decision?", "stage-2"),
    ("act-5", "Acquisition & Pre-Development Financing",
     "How will the site be controlled, funded, documented, and closed?", "stage-5"),
    ("act-6", "Planning, Programming & Concept Design",
     "How does the concept translate into a site plan, program, yield, and preliminary design?", "stage-3"),
    ("act-7", "Zoning, Entitlements & Public Approvals",
     "What land-use approvals and conditions are required to build the intended project?", "stage-4"),
    ("act-8", "Design & Engineering",
     "How will the concept become coordinated, code-compliant, construction-ready documents?", "stage-3"),
    ("act-9", "Development & Construction Financing",
     "What debt/equity capital stack will fund development and construction, and on what terms?", "stage-5"),
    ("act-10", "Permitting & Preconstruction",
     "Is the design permitted, priced, procured, scheduled, and ready to build?", "stage-4"),
    ("act-11", "Construction & Development Management",
     "How will the owner control cost, schedule, quality, changes, draws, and information?", "stage-6"),
    ("act-12", "Marketing, Leasing & Sales",
     "How will the project generate demand and convert it into leases, sales, or revenue?", "stage-7"),
    ("act-13", "Completion, Commissioning & Jurisdictional Acceptance",
     "Is the project complete, tested, documented, accepted, and legally ready for occupancy?", "stage-6"),
    ("act-14", "Operations, Property Management & Asset Management",
     "How will physical operations and investment performance be managed after delivery?", "stage-8"),
    ("act-15", "Stabilization, Refinance & Disposition",
     "Has the project met its objectives, and should ownership hold, refinance, or sell?", "stage-8"),
]

# ---------------------------------------------------------------------------
# 3. PROFESSIONAL cards (manual §4 & §11). Each maps to the major activities it
#    contributes to, with a weight (100 = primary/lead, lower = supporting).
#    Responsibilities overlap by design — multiple defensible matches allowed.
# ---------------------------------------------------------------------------
# (proId, title, contribution, {activityId: weight})
PROFESSIONALS = [
    ("pro-developer", "Developer / Owner",
     "Project leadership, risk-taking, capital allocation, integration, and key decisions.",
     {"act-1": 80, "act-2": 80, "act-3": 60, "act-5": 80, "act-9": 100, "act-11": 60}),
    ("pro-devmgr", "Development Manager",
     "Day-to-day coordination of consultants, workstreams, budget, schedule, and execution.",
     {"act-6": 80, "act-8": 60, "act-11": 100, "act-13": 60}),
    ("pro-acqmgr", "Acquisition Manager",
     "Site sourcing, acquisition strategy, negotiations, and transaction execution.",
     {"act-2": 100, "act-5": 60}),
    ("pro-finanalyst", "Financial Analyst",
     "Underwriting, pro formas, returns, sensitivities, and scenario analysis.",
     {"act-1": 40, "act-3": 100, "act-9": 60}),
    ("pro-market", "Market Research Consultant",
     "Supply/demand, demographics, competition, absorption, rents/prices, and positioning.",
     {"act-1": 100, "act-12": 40}),
    ("pro-broker", "Land / Investment Broker",
     "Site sourcing, market intelligence, negotiation, leasing, or investment sales.",
     {"act-2": 80, "act-1": 40, "act-12": 60, "act-15": 60}),
    ("pro-reattorney", "Real Estate Attorney",
     "Purchase agreements, title matters, loan/JV documents, leases, closing, and risk.",
     {"act-2": 60, "act-4": 60, "act-5": 100, "act-9": 40}),
    ("pro-luattorney", "Land-Use Attorney",
     "Zoning strategy, entitlement process, hearings, conditions, development agreements.",
     {"act-7": 100}),
    ("pro-title", "Title / Escrow Company",
     "Title commitment, exceptions, escrow administration, and closing coordination.",
     {"act-4": 60, "act-5": 100}),
    ("pro-surveyor", "Surveyor",
     "Boundary, ALTA/NSPS, topographic, easement, and as-built surveys.",
     {"act-4": 100}),
    ("pro-environmental", "Environmental Consultant",
     "Phase I/II environmental assessment and environmental risk evaluation.",
     {"act-4": 100}),
    ("pro-geotech", "Geotechnical Engineer",
     "Subsurface investigation, soils, earthwork, foundations, and recommendations.",
     {"act-4": 80, "act-8": 60}),
    ("pro-civil", "Civil Engineer",
     "Grading, drainage, utilities, infrastructure, site engineering, and civil permitting.",
     {"act-6": 60, "act-7": 40, "act-8": 100, "act-11": 40}),
    ("pro-traffic", "Traffic Engineer",
     "Traffic impact, access, circulation, parking, and transportation studies.",
     {"act-7": 100}),
    ("pro-planner", "Land Planner",
     "Land-use planning, yield studies, site planning, entitlement exhibits, coordination.",
     {"act-1": 40, "act-6": 100, "act-7": 60}),
    ("pro-architect", "Architect",
     "Programming, building design, code coordination, construction documents, CA.",
     {"act-6": 80, "act-8": 100, "act-10": 40, "act-13": 40}),
    ("pro-landscape", "Landscape Architect",
     "Landscape, streetscape, open space, irrigation, and site amenity design.",
     {"act-8": 100}),
    ("pro-structmep", "Structural / MEP Engineers",
     "Structural and building systems design, calculations, coordination, and CDs.",
     {"act-8": 100}),
    ("pro-costest", "Cost Estimator",
     "Conceptual/detailed estimates, cost reconciliation, and value-engineering support.",
     {"act-3": 60, "act-8": 60, "act-10": 100}),
    ("pro-gc", "General Contractor",
     "Preconstruction, estimating, procurement, scheduling, construction, safety, closeout.",
     {"act-10": 80, "act-11": 100, "act-13": 60}),
    ("pro-ownerrep", "Owner's Representative / Construction Manager",
     "Owner-side construction oversight, reporting, cost, schedule, and quality monitoring.",
     {"act-11": 100, "act-13": 60}),
    ("pro-lender", "Construction Lender / Mortgage Banker",
     "Debt underwriting, loan structure, construction/permanent financing, and closing.",
     {"act-5": 60, "act-9": 100, "act-15": 40}),
    ("pro-equity", "Equity Investor / JV Partner",
     "Equity capital, investment underwriting, governance, approvals, return requirements.",
     {"act-9": 100, "act-15": 40}),
    ("pro-appraiser", "Appraiser",
     "Independent opinion of value supporting financing, investment, or disposition.",
     {"act-9": 60, "act-15": 80}),
    ("pro-cpa", "CPA / Tax Advisor",
     "Tax structure, accounting, reporting, tax impacts, and financial controls.",
     {"act-5": 40, "act-9": 60, "act-15": 60}),
    ("pro-marketing", "Marketing Agency",
     "Branding, campaign strategy, collateral, digital marketing, and lead generation.",
     {"act-12": 100}),
    ("pro-leasing", "Leasing / Sales Broker or Agent",
     "Pricing feedback, prospecting, tours, negotiations, leases, lot/unit sales.",
     {"act-12": 100, "act-14": 40}),
    ("pro-pm", "Property Manager",
     "Operations, tenant/resident service, rent collection, maintenance, budgets, vendors.",
     {"act-3": 20, "act-14": 100}),
    ("pro-am", "Asset Manager",
     "Business plan, NOI, capital planning, financing strategy, hold/sell analysis.",
     {"act-14": 80, "act-15": 100}),
    ("pro-commissioning", "Commissioning Agent",
     "Functional testing and verification that building systems perform as intended.",
     {"act-13": 100}),
    ("pro-officials", "Building / Jurisdiction Officials",
     "Plan review, inspections, permits, certificates, public improvement acceptance.",
     {"act-7": 40, "act-10": 60, "act-13": 100}),
]

# ---------------------------------------------------------------------------
# 4. TASK / DELIVERABLE cards (manual §11 "Representative Tasks / Deliverables").
# ---------------------------------------------------------------------------
# (taskId, title, description, {activityId: weight})
TASKS = [
    ("task-marketstudy", "Market Study / Concept Test",
     "Market study; highest-and-best-use / concept test.", {"act-1": 100}),
    ("task-siteloi", "Site Search & LOI / Site Control",
     "Site search/screening; LOI / site-control strategy.", {"act-2": 100}),
    ("task-proforma", "Development Pro Forma",
     "Development pro forma; return/sensitivity analysis.", {"act-3": 100, "act-9": 40}),
    ("task-ddreports", "Title, Survey & Environmental Reports",
     "Title/survey; environmental; geotechnical; utilities; zoning/code review.", {"act-4": 100}),
    ("task-closingdocs", "Purchase & Closing Documentation",
     "Purchase/closing documentation; early-stage financing.", {"act-5": 100}),
    ("task-conceptplan", "Concept Site Plan / Yield Study",
     "Concept site plan / yield study; programming / concept design.", {"act-6": 100}),
    ("task-entitlementapp", "Entitlement Application & Traffic Study",
     "Entitlement application; traffic/access study.", {"act-7": 100}),
    ("task-constrdocs", "Schematic Design → Construction Documents",
     "SD; design development; construction documents; value engineering.", {"act-8": 100}),
    ("task-capitalstack", "Sources & Uses / Capital Stack",
     "Sources & uses / capital stack; loan / JV documentation.", {"act-9": 100}),
    ("task-permitgmp", "Permit Submission & GMP / Procurement",
     "Permit submission; bidding/GMP/procurement; schedule/mobilization.", {"act-10": 100}),
    ("task-drawprocess", "Construction Administration & Draw Process",
     "Construction administration; owner/lender draw process.", {"act-11": 100}),
    ("task-gotomarket", "Branding & Leasing/Sales Execution",
     "Branding / go-to-market; leasing/sales execution.", {"act-12": 100}),
    ("task-closeout", "Punch List, Commissioning & Final Inspections",
     "Punch list/closeout; commissioning / final inspections.", {"act-13": 100}),
    ("task-operatingplan", "Property Operating & Asset Management Plan",
     "Property operating plan; asset management/performance reporting.", {"act-14": 100}),
    ("task-holdsell", "Stabilization / Refinance / Disposition Analysis",
     "Stabilization/refinance analysis; hold/sell analysis / disposition.", {"act-15": 100}),
]

# ---------------------------------------------------------------------------
# 5. DECISION cards — developer go/no-go gates (manual §11 "Developer Decision").
# ---------------------------------------------------------------------------
# (decisionId, title, {activityId: weight})
DECISIONS = [
    ("dec-concept", "Proceed with the concept?", {"act-1": 100}),
    ("dec-site", "Pursue this site? Enter site control / LOI?", {"act-2": 100}),
    ("dec-criteria", "Does the opportunity meet investment criteria?", {"act-3": 100}),
    ("dec-dd", "Proceed after due diligence?", {"act-4": 100}),
    ("dec-close", "Close the acquisition?", {"act-5": 100}),
    ("dec-plan", "Advance the plan / program?", {"act-6": 100}),
    ("dec-entitlement", "Pursue / accept entitlement conditions?", {"act-7": 100}),
    ("dec-design", "Approve design development?", {"act-8": 100}),
    ("dec-capital", "Commit the capital stack?", {"act-9": 100}),
    ("dec-authorize", "Authorize construction?", {"act-10": 100}),
    ("dec-changes", "Approve changes / use contingency?", {"act-11": 100}),
    ("dec-pricing", "Adjust pricing / marketing / leasing?", {"act-12": 100}),
    ("dec-accept", "Accept completion / transition to operations?", {"act-13": 100}),
    ("dec-opsplan", "Adjust the operating business plan?", {"act-14": 100}),
    ("dec-exit", "Hold, refinance, or sell?", {"act-15": 100}),
]

# ---------------------------------------------------------------------------
# 6. COST CATEGORIES for the budget/schedule extension (manual §12).
# ---------------------------------------------------------------------------
COST_CATEGORIES = [
    "Acquisition Cost",
    "Soft Cost",
    "Hard Cost",
    "Financing Cost",
    "Operating Cost",
    "Selling/Leasing Cost",
]
