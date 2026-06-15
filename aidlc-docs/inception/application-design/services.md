# Application Design — Services (Orchestration Layer)

Per Q1=A, the backend is a **single logical API service** composed of internal **service-layer
orchestrators** (modules), each coordinating one or more components. Orchestrators apply
authorization (via Identity & Access) before performing actions.

## S1. Identity Service
- **Coordinates**: C2 (Identity & Access)
- **Responsibilities**: registration, login, token issuance/validation, current-user resolution.
- **Used by**: All other services for `authorize(...)`.

## S2. Authoring Service
- **Coordinates**: C3 (Authoring) → C6 (for exercise generation linkage)
- **Responsibilities**: template listing, configuration CRUD, save-as-template, apply-to-exercise.
- **Orchestration**: `applyConfiguration` creates/refreshes an Exercise instance and clears its prior placements/results while leaving historical attempts intact.

## S3. Exercise Service
- **Coordinates**: C4 (Exercise) → C5 (Scoring) → C6 (Results & History)
- **Responsibilities**: serve exercise view, save placements, run submission/scoring, manage the correct-and-resubmit-once flow, persist attempts and reflections.
- **Orchestration (submit)**:
  1. Validate complete sort.
  2. Call C5 `score(placements, configuration)`.
  3. Build feedback (incorrect cards, weakest match + reflection prompt).
  4. Call C6 `recordAttempt(...)`.
  5. Return score + per-card feedback.
- **Orchestration (resubmit)**: verify state allows exactly one resubmission → re-score → record final attempt → lock.

## S4. Results Service
- **Coordinates**: C6 (Results & History)
- **Responsibilities**: student history retrieval, attempt detail, instructor class results (ownership-scoped), reflection capture.

## S5. Session Service
- **Coordinates**: C7 (Live Session) → C3/C4 (exercise reference) → C6 (record attempts) → Real-time channel
- **Responsibilities**: start/join/end sessions; aggregate progress; publish real-time progress events to the instructor.
- **Orchestration (live submit)**: student submissions during a session flow through S3 (Exercise Service) for scoring/recording, then S5 updates and publishes progress.

## Cross-Cutting Concerns
- **Authorization**: every service calls Identity Service `authorize()` before protected operations; ownership scoping ensures instructors see only their content and students see only their own data.
- **Data access**: each component uses repository abstractions over the data store (concrete store chosen in Infrastructure Design: DynamoDB).
- **Reproducibility**: recorded attempts store the effective configuration snapshot/feedback so results are reproducible and unaffected by later edits (NFR-4.1/4.2).

## Service → Story Coverage
| Service | Stories |
|---|---|
| S1 Identity | US-1.1, US-1.2, US-1.3 |
| S2 Authoring | US-2.1–2.5 |
| S3 Exercise | US-3.1–3.6 |
| S4 Results | US-4.1, US-4.2 |
| S5 Session | US-5.1, US-5.2, US-5.3 |
