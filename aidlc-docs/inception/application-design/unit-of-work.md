# Units of Work — ProcessCanvas

## Decomposition Decisions (from unit-of-work-plan.md)
| # | Decision | Choice |
|---|---|---|
| Q1 | Deployment model | Modular monolith — one deployable backend (modules per unit) + SPA + one IaC stack |
| Q2 | Code organization | Single monorepo: `frontend/`, `backend/`, `infrastructure/` |
| Q3 | Frontend units | Split into **Instructor UI** and **Student UI** units |
| Q4 | Backend unit boundaries | Five backend units as proposed |
| Q5 | Build order | Foundation-first (dependency-respecting) |

## Unit Inventory (7 units)

### U0A — Instructor Web UI (frontend)
- **Responsibilities**: Instructor-facing SPA views — login, template selection, configuration table editing, save/apply, reflection/feedback customization, class results, live-session host (start/monitor with real-time progress).
- **Type**: Frontend module (part of the SPA), instructor routes.
- **Depends on**: U1, U2, U4, U5 (via REST + real-time).

### U0B — Student Web UI (frontend)
- **Responsibilities**: Student-facing SPA views — login, exercise view, drag-and-drop sorting (multi-phase placement), submit, feedback display, correct-and-resubmit-once with verify, reflection entry, personal history, join live session.
- **Type**: Frontend module (part of the SPA), student routes.
- **Depends on**: U1, U3, U4, U5 (via REST + real-time).

### U1 — Identity & Access (backend module)
- **Responsibilities**: registration, login, role assignment (Instructor/Student), token issuance/validation, authorization + ownership scoping (component C2).
- **Depends on**: none (foundation).

### U2 — Authoring (backend module)
- **Responsibilities**: system-seeded + instructor-saved templates, configuration CRUD (phases, activities, weighted mappings, reflection prompts), save, apply-to-exercise (component C3).
- **Depends on**: U1 (auth), U3 (creates/refreshes exercise instances on apply).

### U3 — Exercise & Scoring (backend module)
- **Responsibilities**: exercise instance lifecycle, in-progress placements (multi-phase), submission, correct-and-resubmit-once (verify + one final resubmit), and the **isolated, pure Scoring** sub-module (weighted score, per-card correctness, partial credit, weakest-match selection) (components C4 + C5).
- **Depends on**: U1 (auth), U4 (record attempts).

### U4 — Results & History (backend module)
- **Responsibilities**: persist/retrieve submissions, attempts, scores, per-card feedback, reflections; per-student history; instructor class-results (ownership-scoped); reproducibility of stored results (component C6).
- **Depends on**: U1 (auth).

### U5 — Live Session (backend module)
- **Responsibilities**: session lifecycle (start/join/end), concurrent access, progress aggregation, real-time progress publishing over the WebSocket/real-time channel (component C7).
- **Depends on**: U1 (auth), U3 (submissions/scoring), U4 (record).

## Code Organization Strategy (Greenfield, monorepo)
```
processcanvas/                      # repo root (workspace root)
├── frontend/                       # SPA (Instructor UI + Student UI modules)
│   ├── src/
│   │   ├── instructor/             # U0A views/components
│   │   ├── student/                # U0B views/components
│   │   ├── shared/                 # shared UI (auth, api client, real-time client)
│   │   └── ...
│   └── package.json
├── backend/                        # single deployable backend (modular monolith)
│   ├── src/
│   │   ├── identity/               # U1 module
│   │   ├── authoring/              # U2 module
│   │   ├── exercise/               # U3 module (incl. scoring/ sub-module)
│   │   │   └── scoring/            # C5 isolated pure scoring
│   │   ├── results/                # U4 module
│   │   ├── live_session/           # U5 module
│   │   ├── api/                    # C8 API service: REST routing + real-time
│   │   └── shared/                 # auth middleware, repositories, types
│   └── package.json
├── infrastructure/                 # IaC (single stack): S3 + Amplify Hosting (frontend), API GW (REST+WS),
│   └── ...                         #   Lambda, DynamoDB, Cognito (finalized in Infra Design)
└── README.md
```
- Backend units are **logical modules** within one deployable; the API module orchestrates them.
- Scoring lives as a pure sub-module under `exercise/scoring/` for isolated unit testing.
- Exact runtime/language and IaC tool are decided in NFR Requirements and Infrastructure Design.

## Build / Design Order (Foundation-first)
1. **U1 Identity & Access** (foundation; everything depends on auth)
2. **U2 Authoring**
3. **U3 Exercise & Scoring**
4. **U4 Results & History** (note: U3 depends on U4 for recording; U4 has no upstream deps, so it can be designed alongside/before U3 — see dependency notes)
5. **U5 Live Session**
6. **U0A Instructor UI** and **U0B Student UI** (built against their backend units as those stabilize; can proceed incrementally per vertical slices)

> Sequencing note: Because U3 records via U4, U4's data contracts should be defined before/with U3.
> The construction per-unit loop will follow this dependency-respecting order.
