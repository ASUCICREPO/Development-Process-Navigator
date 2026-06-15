# Unit of Work Plan — ProcessCanvas

**Purpose**: Decompose ProcessCanvas into units of work for development, define their dependencies,
and map user stories to units. Builds on the approved Application Design (single API service with
internal domain modules, isolated Scoring, real-time live sessions, REST).

## Execution Checklist (Part 2 will execute these)
- [x] Generate `unit-of-work.md` — unit definitions, responsibilities, and (greenfield) code organization strategy
- [x] Generate `unit-of-work-dependency.md` — dependency matrix and update/build order
- [x] Generate `unit-of-work-story-map.md` — map all 16 stories (US-1.x..US-5.x) to units
- [x] Validate unit boundaries and dependencies
- [x] Ensure all stories are assigned to a unit

---

## Proposed Units (for context; confirmed/adjusted via answers)
- **U1 Identity & Access** — registration, login, roles, authorization (C2)
- **U2 Authoring** — templates (seeded + instructor-saved), configuration editing, save, apply (C3)
- **U3 Exercise & Scoring** — exercise lifecycle, placements, submit, correct-and-resubmit-once, isolated Scoring (C4 + C5)
- **U4 Results & History** — persistence/retrieval of attempts/reflections, instructor/student views (C6)
- **U5 Live Session** — session lifecycle, join, real-time progress (C7)
- **Web Client (SPA)** and **API/Infra** treated per answers below.

---

## Clarifying Questions

## Question 1: Deployment Model
How should units be deployed (serverless context, ~100 users)?

A) Modular monolith — one deployable backend (units are logical modules) + one SPA + one IaC stack — simplest to build/operate at this scale

B) Independently deployable microservices — one service per unit

C) Hybrid — mostly one backend, but Live Session split out (it uses the real-time channel)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: Code Organization (Greenfield)
What repository/directory structure do you prefer?

A) Single monorepo with top-level `frontend/`, `backend/` (modules per unit), and `infrastructure/`

B) Separate repos for frontend, backend, and infrastructure

C) No preference — recommend the best fit

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: Web Client (SPA) as a Unit
How should the frontend be treated in the decomposition?

A) A single dedicated Web Client unit (U0) covering both instructor and student UIs

B) Frontend split into Instructor UI and Student UI units

C) Frontend folded into each backend unit (not separate)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4: Unit Boundaries Confirmation
Do the proposed backend units (U1 Identity & Access, U2 Authoring, U3 Exercise & Scoring, U4 Results & History, U5 Live Session) work for you?

A) Yes — use these five backend units as proposed

B) Merge Results & History (U4) into Exercise & Scoring (U3)

C) Keep Scoring as its own separate unit (split from U3)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5: Build/Development Order
Any preference on the order units are designed/built first?

A) Foundation-first: Identity & Access → Authoring → Exercise & Scoring → Results & History → Live Session (recommended; respects dependencies)

B) Vertical slice first: a thin end-to-end path (login → author → sort → score) before adding the rest

C) No preference — use the dependency-driven order

X) Other (please describe after [Answer]: tag below)

[Answer]: A
