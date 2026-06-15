# U0A Instructor UI — Frontend Components

SPA instructor experience. Talks to the REST API and subscribes to the real-time channel for live
sessions. (SPA framework chosen in NFR Requirements.)

## Component Hierarchy
- `InstructorApp`
  - `AuthGate` (redirects to login if unauthenticated; requires role=INSTRUCTOR)
  - `LoginRegister` (instructor self-register + login)
  - `InstructorDashboard`
    - `TemplatePicker` — list system + saved templates; start a configuration
    - `ConfigurationEditor`
      - `ActivityTable` — add/edit/remove activities (title, description)
      - `WeightMatrix` — per activity × fixed phase weights (0–100)
      - `ReflectionPromptEditor` — per activity-phase explanation + reflection prompt
      - `ValidationSummary` — shows apply-readiness (every activity mapped)
      - `SaveControls` — Save, Save as Template, Apply to Exercise
    - `ClassResults` — per-student final scores for a selected exercise
    - `LiveSessionHost`
      - `SessionControls` — Start / End session, show joinCode
      - `LiveProgressPanel` — real-time submittedCount, score distribution

## Key Props / State
- `AuthGate`: state { user, role, token }.
- `ConfigurationEditor`: state { configId, activities[], weights{activityId→{phase→weight}}, prompts{(activityId,phase)→{explanation,prompt}}, validation }.
- `WeightMatrix`: props { activities, phases (fixed), weights }, emits weight changes (0–100).
- `LiveProgressPanel`: state { snapshot }, updated by real-time ProgressEvents.

## User Interaction Flows
- Author: pick template → edit activities/weights → set prompts → validate → save → apply.
- Review: open exercise → view class results.
- Live: start session → share joinCode → watch live progress → end session.

## Form Validation (client-side, mirrors U2 rules)
- Activity requires non-empty title.
- Weights are integers 0–100.
- Apply disabled until every activity has ≥1 phase with weight > 0 (BR-4.1).

## API / Real-time Integration
- REST: `GET /templates`, `POST /configurations`, `PUT /configurations/{id}`, `POST /configurations/{id}/apply`, `POST /configurations/{id}/save-as-template`, `GET /exercises/{id}/results`, `POST /sessions`, `POST /sessions/{id}/end`, `GET /sessions/{id}/progress`.
- Real-time: subscribe to session progress; render ProgressEvents.

## Story Coverage
- US-1.x (login) · US-2.1–2.5 (authoring) · US-4.2 (class results) · US-5.1, US-5.3 (live host + progress)
