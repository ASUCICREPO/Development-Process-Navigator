# API Contract — ProcessCanvas (REST + Real-time)

Base path served by API Gateway (REST); all protected routes require a Cognito-issued bearer token.

## Auth (U1)
- `POST /auth/register` → { email, password, displayName, role, joinCode? } → { userId }
- `POST /auth/login` → { email, password } → { token, role }
- `GET /me` → { userId, role }
- `POST /join-codes` (instructor) → { code }
- `POST /roster` (instructor) → { studentEmail } → { enrollmentId? }

## Authoring (U2, instructor)
- `GET /templates` → [{ templateId, source, name }]
- `POST /configurations` → { name, templateId? } → { configId }
- `PUT /configurations/{id}` → { activities, mappings, prompts }
- `POST /configurations/{id}/apply` → { exerciseId, versionId, versionNumber }
- `POST /configurations/{id}/save-as-template` → { templateId }

## Exercise & Scoring (U3, student)
- `GET /exercises/{id}` → ExerciseView { activities, phases, placements?, attemptCount, locked }
- `PUT /exercises/{id}/placements` → { placements: { activityId: [phase,...] } }
- `POST /exercises/{id}/submit` → SubmissionResult { attemptId, scorePercent, cardFeedback[] }
- `GET /exercises/{id}/attempts/{attemptId}/feedback` → FeedbackView { scorePercent, cardFeedback[], weakestMatch }
- `POST /exercises/{id}/verify` → review view (no new official score)
- `POST /exercises/{id}/resubmit` → final SubmissionResult (locks after)

## Results & History (U4)
- `GET /students/{id}/history` → [AttemptSummary] (self or owning instructor)
- `GET /attempts/{id}` → AttemptDetail (reproducible)
- `POST /attempts/{id}/reflection` → { response }
- `GET /exercises/{id}/results` (instructor) → [StudentResult]

## Live Session (U5)
- `POST /sessions` (instructor) → { sessionId, joinCode }
- `POST /sessions/{id}/join` (student) → SessionView
- `GET /sessions/{id}/progress` (instructor) → ProgressSnapshot
- `POST /sessions/{id}/end` (instructor)

## Real-time (WebSocket)
- Connect (WSS) → `subscribe(sessionId)` (instructor)
- Server → ProgressEvent { type: Joined|Submitted|Updated, submittedCount, totalParticipants, scoreDistribution }

## Conventions
- Errors: `{ "error": "message" }` with HTTP status (400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict/resubmit-once).
- Placement shape: `{ activityId: [Phase, ...] }`; an activity may appear in multiple phases.
