# Application Design — Components

**Architecture decisions applied**: Single logical API service with internal domain modules (Q1=A);
dedicated isolated Scoring module (Q2=A); real-time push for live progress via a WebSocket/AppSync
channel alongside REST (Q3=B + Q5=A); templates are system-seeded plus instructor-saved (Q4=B);
REST API style (Q5=A).

> Note: These are **logical** components. Their mapping to concrete AWS services (Lambda functions,
> DynamoDB tables, Cognito, API Gateway REST + WebSocket, etc.) is decided in Infrastructure Design.

## C1. Web Client (SPA)
- **Purpose**: Single-page app providing the Instructor authoring UI and the Student exercise UI.
- **Responsibilities**:
  - Render role-appropriate views after authentication.
  - Instructor: template selection, configuration table editing, save/apply, reflection/feedback customization, results & live-session host views.
  - Student: drag-and-drop sorting (incl. multi-phase placement), submit, view feedback, correct-and-resubmit-once, reflection entry, history.
  - Maintain a real-time connection for live-session progress.
- **Interface (consumes)**: REST API (CRUD/actions) + Real-time channel (live updates).

## C2. Identity & Access Component
- **Purpose**: Account registration, authentication, role assignment, and authorization checks.
- **Responsibilities**:
  - Register users with role (Instructor/Student); authenticate logins.
  - Issue/validate auth tokens; expose current user + role.
  - Enforce role-based authorization for protected actions and ownership scoping.
- **Interface (exposes)**: register, login, getCurrentUser, authorize(action, resource).

## C3. Authoring Component
- **Purpose**: Manage activity/phase configurations and templates.
- **Responsibilities**:
  - List/seed system templates; let instructors save configurations as reusable templates.
  - Create/edit configurations (phases, activities, weighted activity→phase mappings, reflection prompts/explanations).
  - Save/load configurations; apply a configuration to generate/refresh a student Exercise instance (clearing prior placements/results for that instance; preserving past attempts).
- **Interface (exposes)**: listTemplates, createConfiguration, updateConfiguration, saveConfiguration, saveAsTemplate, getConfiguration, applyConfiguration.

## C4. Exercise Component
- **Purpose**: Manage the student exercise lifecycle and the correct-and-resubmit-once flow.
- **Responsibilities**:
  - Provide an exercise instance (unsorted activities + phase buckets) derived from a configuration.
  - Track in-progress placements (move between buckets/pool; same activity may be placed in multiple phases).
  - Accept a complete submission; invoke Scoring; return score + per-card feedback.
  - Enforce exactly one correction/resubmission cycle: indicate incorrect placements, allow edits, support a verify (review) step, accept one final resubmission, then lock.
  - Hand off final results to Results & History.
- **Interface (exposes)**: getExercise, savePlacements, submit, getFeedback, verifyRevision, resubmit.

## C5. Scoring Component (isolated, pure)
- **Purpose**: Compute alignment scoring and feedback from placements and a configuration.
- **Responsibilities**:
  - Compute weighted alignment score from placements vs. weighted activity→phase mappings.
  - Determine per-card correctness (correct / partial / incorrect) and partial-credit explanations.
  - Identify the weakest match and select the associated reflection prompt.
- **Characteristics**: Deterministic and side-effect free (no I/O) for unit testability and reproducibility.
- **Interface (exposes)**: score(placements, configuration), evaluateCard(...), selectWeakestMatch(...).

## C6. Results & History Component
- **Purpose**: Persist and retrieve submissions, attempts, scores, feedback, and reflections.
- **Responsibilities**:
  - Record each submission/attempt (placements, score, per-card feedback, reflection response).
  - Retain per-student attempt history; ensure stored results are reproducible and not altered by later config edits.
  - Provide student's own history and instructor's class-results views (ownership-scoped).
- **Interface (exposes)**: recordAttempt, getStudentHistory, getAttempt, getClassResults.

## C7. Live Session Component
- **Purpose**: Manage live classroom sessions and real-time progress.
- **Responsibilities**:
  - Start/stop a session for an applied exercise; allow enrolled students to join concurrently.
  - Record live-session submissions against student accounts (via Results & History).
  - Aggregate live progress (who has submitted, score distribution) and push updates to the instructor.
- **Interface (exposes)**: startSession, joinSession, getSessionProgress, endSession; publishes progress events to the Real-time channel.

## C8. API Service (single logical backend + Real-time channel)
- **Purpose**: Single entry point that authenticates requests and orchestrates the domain components; hosts the real-time channel for live progress.
- **Responsibilities**:
  - Expose REST endpoints; route to service-layer orchestrators (see services.md).
  - Apply Identity & Access authorization on every protected request.
  - Manage the WebSocket/real-time connections for live-session subscribers.
- **Interface (exposes)**: REST endpoints (see component-methods.md) + real-time subscribe/publish.

## Coverage Check
| Requirement / Journey | Component(s) |
|---|---|
| FR-1 Auth (US-1.x) | C2, C8 |
| FR-2 Authoring (US-2.x) | C3, C8, C1 |
| FR-3 Student Exercise (US-3.1–3.4) | C4, C1, C8 |
| FR-4 Scoring/Feedback/Reflection (US-3.5–3.6) | C5, C4, C6 |
| FR-5 Persistence & History (US-4.x) | C6, C3 |
| FR-6 Live Session (US-5.x) | C7, C8, C1 |
