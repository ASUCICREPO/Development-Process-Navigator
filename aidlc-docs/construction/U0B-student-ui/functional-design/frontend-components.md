# U0B Student UI — Frontend Components

SPA student experience: drag-and-drop sorting, feedback, correct-and-resubmit-once, reflection,
history, and joining live sessions.

## Component Hierarchy
- `StudentApp`
  - `AuthGate` (role=STUDENT)
  - `LoginRegister` (student register with optional joinCode + login)
  - `StudentHome`
    - `JoinSession` — enter joinCode to join a live session
    - `ExerciseBoard`
      - `UnsortedPool` — activity cards not yet placed (cards remain available for multi-phase placement)
      - `PhaseBucket` (×3: Planning, Construction, Operations) — drop targets
      - `SubmitBar` — Submit (enabled only when complete), shows completeness
      - `FeedbackPanel` — score + per-card Correct/Partial/Incorrect; highlights incorrect cards
      - `VerifyResubmit` — review revised placements, then Resubmit (once)
      - `ReflectionForm` — weakest-match prompt + response capture
    - `HistoryView` — list of past attempts with scores/feedback/reflections

## Key Props / State
- `ExerciseBoard`: state { exercise, placements{activityId→Set<phase>}, attemptCount, locked, feedback?, weakestMatch? }.
- `PhaseBucket`: props { phase, cards }, emits drop/move events.
- `SubmitBar`: derived `isComplete` = every activity placed ≥1; disables Submit otherwise (BR-3.3).
- `VerifyResubmit`: visible only when attemptCount=1 and not locked.

## User Interaction Flows
- Sort: drag cards from pool into buckets (same activity may go into multiple buckets) → Submit.
- Feedback: view score + per-card results; incorrect cards highlighted.
- Correct & resubmit once: edit incorrect placements → Verify (review) → Resubmit → results locked.
- Reflect: answer weakest-match prompt → saved.
- History: review past attempts.

## Form Validation (client-side, mirrors U3 rules)
- Submit/Resubmit disabled until complete sort (every activity placed at least once).
- After final resubmit, board is read-only (locked).

## API / Real-time Integration
- REST: `GET /exercises/{id}`, `PUT /exercises/{id}/placements`, `POST /exercises/{id}/submit`, `GET /exercises/{id}/attempts/{attemptId}/feedback`, `POST /exercises/{id}/verify`, `POST /exercises/{id}/resubmit`, `POST /attempts/{id}/reflection`, `GET /students/{id}/history`, `POST /sessions/{id}/join`.

## Story Coverage
- US-1.x (login/register) · US-3.1–3.6 (sort, submit, feedback, resubmit-once, reflect) · US-4.1 (history) · US-5.2 (join + complete live)
