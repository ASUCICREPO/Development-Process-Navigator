# Application Design — ProcessCanvas (Consolidated)

This document consolidates the application design. See the companion files for detail:
`components.md`, `component-methods.md`, `services.md`, `component-dependency.md`.

## 1. Design Decisions (from application-design-plan.md)
| # | Decision | Choice |
|---|---|---|
| Q1 | Backend decomposition | Single logical API service with internal domain modules |
| Q2 | Scoring placement | Dedicated, isolated, pure Scoring component |
| Q3 | Live progress mechanism | Real-time push (WebSocket/AppSync) |
| Q4 | Templates source | System-seeded + instructor-saved templates |
| Q5 | API style | REST (with a separate real-time channel for live sessions) |

## 2. Logical Components
- **C1 Web Client (SPA)** — instructor & student UIs; REST + real-time client.
- **C2 Identity & Access** — registration, login, roles, authorization.
- **C3 Authoring** — templates, configuration editing, save, apply.
- **C4 Exercise** — exercise lifecycle, placements, submit, correct-and-resubmit-once.
- **C5 Scoring (pure)** — weighted score, per-card correctness, partial credit, weakest match.
- **C6 Results & History** — persist/retrieve attempts, reflections; instructor/student views.
- **C7 Live Session** — session lifecycle, join, real-time progress.
- **C8 API Service** — single backend entry point (REST) + real-time channel; authorization gate.

## 3. Service (Orchestration) Layer
- **S1 Identity**, **S2 Authoring**, **S3 Exercise** (orchestrates Exercise → Scoring → History),
  **S4 Results**, **S5 Session** (orchestrates Live → Exercise/History + real-time publish).
- Authorization applied on every protected operation; ownership scoping enforced.

## 4. Dependencies & Communication
- Client → API (REST + real-time subscribe). API → all domain components; authorizes via Identity.
- Authoring → Exercise (apply). Exercise → Scoring (pure call) + History (record). Live → Exercise/History + publishes progress.
- REST for standard actions; real-time push only for live-session progress; Scoring is a pure, I/O-free function.
- Full matrix and data flows in `component-dependency.md`.

## 5. Key Design Properties
- **Isolated scoring** enables independent unit testing and reproducible results.
- **Reproducibility**: attempts store effective configuration/feedback snapshot so later edits don't alter past results (NFR-4.1/4.2).
- **Correct-and-resubmit-once**: exactly one correction cycle; verify is a pre-resubmission review step; second submission is final (US-3.4/FR-3.5).
- **Multi-phase placement**: an activity may be placed into multiple phases (US-3.2/FR-3.2).
- **Serverless-friendly**: stateless orchestration; concrete AWS service mapping deferred to Infrastructure Design.

## 6. Requirement & Story Coverage
- FR-1/US-1.x → C2, C8, S1
- FR-2/US-2.x → C3, C8, S2
- FR-3/US-3.1–3.4 → C4, C1, C8, S3
- FR-4/US-3.5–3.6 → C5, C4, C6, S3
- FR-5/US-4.x → C6, C3, S4
- FR-6/US-5.x → C7, C8, C1, S5

## 7. Deferred to Later Stages
- Exact weighted-scoring and partial-credit math → Functional Design (per unit).
- Tech stack specifics (SPA framework, language/runtime) → NFR Requirements.
- Concrete AWS services and IaC → Infrastructure Design.
