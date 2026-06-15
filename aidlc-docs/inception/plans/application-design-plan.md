# Application Design Plan — ProcessCanvas

**Role**: Software architect
**Purpose**: Identify high-level components, their responsibilities and interfaces, the service
layer, and component dependencies. (Detailed business logic and exact tech stack come later in
Functional Design and NFR Requirements.)

## Execution Checklist (Part 2 will execute these)
- [x] Generate `components.md` — component definitions and high-level responsibilities
- [x] Generate `component-methods.md` — method signatures + I/O (business rules deferred to Functional Design)
- [x] Generate `services.md` — service definitions and orchestration patterns
- [x] Generate `component-dependency.md` — dependency matrix, communication patterns, data flow
- [x] Generate consolidated `application-design.md`
- [x] Validate design completeness against FR-1..FR-6 and US-1..US-5

---

## Preliminary Component View (for context; refined after answers)
- **Web Client (SPA)** — instructor authoring UI + student exercise UI
- **Identity/Access** — registration, login, roles, authorization
- **Authoring** — templates, configuration editing, save, apply
- **Exercise** — exercise instances, placements, submission, resubmit-once flow
- **Scoring** — weighted alignment scoring, per-card correctness, partial credit, weakest-match selection
- **Results/History** — store & retrieve submissions, attempts, reflections; instructor class views
- **Live Session** — session lifecycle, student join, live progress
- **API Layer** — request routing/orchestration over the above

---

## Clarifying Questions

## Question 1: Backend Service Decomposition
How should the backend be organized (serverless-first context)?

A) Single API service (one logical backend) with internal modules per domain — simplest to build/operate at this scale

B) A few coarse services grouped by domain (e.g., Identity, Authoring+Exercise+Scoring, Live Session)

C) Fine-grained microservices, one per capability

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: Scoring as a Component
Where should scoring logic live?

A) A dedicated, isolated Scoring component/module (reusable, independently unit-testable) invoked by the Exercise flow — recommended given the complex scoring rules

B) Embedded directly within the Exercise component (simpler, less separation)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: Live Progress Mechanism
How should the instructor's live-session progress update?

A) Client polling (students/instructor poll the API periodically) — simplest, fine for ~100 users

B) Real-time push (e.g., WebSocket / AWS AppSync subscriptions) — smoother live updates, more infrastructure

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4: Templates Source
What are "predefined templates"?

A) System-seeded templates (curated real-estate-development templates shipped with the app) only

B) System-seeded templates PLUS instructors can save their own configurations as reusable templates

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5: API Style
What API style do you prefer for the client-backend contract?

A) REST (resource-oriented endpoints over API Gateway) — conventional, simple

B) GraphQL (single endpoint, flexible queries; pairs with AppSync if real-time chosen)

C) No preference — recommend based on the other choices

X) Other (please describe after [Answer]: tag below)

[Answer]: A
