# Application Design — Component Methods

Method signatures are language-neutral (pseudo-types). Detailed business rules and exact scoring
math are defined later in **Functional Design** (per-unit, Construction phase). Types like `Id`,
`Result<T>` are abstractions.

## C2. Identity & Access Component
- `register(email, password, role) -> Result<UserId>` — create account with role (Instructor|Student).
- `login(email, password) -> Result<AuthToken>` — authenticate, return token.
- `getCurrentUser(authToken) -> Result<UserProfile{ userId, role }>` — resolve current user.
- `authorize(authToken, action, resource) -> Result<bool>` — role/ownership authorization check.

## C3. Authoring Component
- `listTemplates(authToken) -> Result<List<TemplateSummary>>` — system-seeded + instructor's saved templates.
- `getTemplate(authToken, templateId) -> Result<Configuration>` — load a template as a configuration.
- `createConfiguration(authToken, draft) -> Result<ConfigId>` — start a new configuration (optionally from template).
- `updateConfiguration(authToken, configId, changes) -> Result<void>` — edit phases/activities/weights/prompts.
- `saveConfiguration(authToken, configId) -> Result<void>` — persist configuration for reuse.
- `saveAsTemplate(authToken, configId, name) -> Result<TemplateId>` — save a configuration as a reusable template.
- `getConfiguration(authToken, configId) -> Result<Configuration>` — load saved configuration.
- `applyConfiguration(authToken, configId) -> Result<ExerciseId>` — generate/refresh a student exercise; clears prior placements/results for that instance; past attempts preserved.

## C4. Exercise Component
- `getExercise(authToken, exerciseId) -> Result<ExerciseView{ unsortedActivities, phases, placements?, state }>`
- `savePlacements(authToken, exerciseId, placements) -> Result<void>` — persist in-progress placements (activity may map to multiple phases).
- `submit(authToken, exerciseId, placements) -> Result<SubmissionResult{ attemptId, score, cardFeedback[] }>` — first submission; requires complete sort; invokes Scoring; records attempt.
- `getFeedback(authToken, exerciseId, attemptId) -> Result<FeedbackView{ score, cardFeedback[], incorrectCards[], weakestMatch, reflectionPrompt }>`
- `verifyRevision(authToken, exerciseId, revisedPlacements) -> Result<ReviewView>` — review/confirm revised answer before final resubmission (no new scoring oracle; pre-resubmit review per US-3.4).
- `resubmit(authToken, exerciseId, revisedPlacements) -> Result<SubmissionResult>` — exactly one allowed; produces final attempt; locks further submissions.

## C5. Scoring Component (pure)
- `score(placements, configuration) -> ScoreResult{ totalScore, cardEvaluations[] }` — weighted alignment score.
- `evaluateCard(activityId, placedPhases[], configuration) -> CardEvaluation{ status: correct|partial|incorrect, earned, max, explanation }`
- `selectWeakestMatch(cardEvaluations[], configuration) -> WeakestMatch{ activityId, phase, reflectionPrompt }`
- *(All deterministic, no I/O.)*

## C6. Results & History Component
- `recordAttempt(authToken, attempt) -> Result<AttemptId>` — store placements, score, card feedback, reflection.
- `getStudentHistory(authToken, studentId, exerciseId?) -> Result<List<AttemptSummary>>` — student's own attempts.
- `getAttempt(authToken, attemptId) -> Result<AttemptDetail>` — reproducible stored result.
- `getClassResults(authToken, exerciseId) -> Result<List<StudentResult>>` — instructor view (ownership-scoped).
- `saveReflection(authToken, attemptId, reflectionResponse) -> Result<void>` — capture reflection response.

## C7. Live Session Component
- `startSession(authToken, exerciseId) -> Result<SessionId>` — create live session for an applied exercise.
- `joinSession(authToken, sessionId) -> Result<SessionView>` — enrolled student joins.
- `getSessionProgress(authToken, sessionId) -> Result<ProgressSnapshot{ submittedCount, total, scoreDistribution }>`
- `endSession(authToken, sessionId) -> Result<void>`
- `publishProgress(sessionId, progressEvent)` — push update to subscribed instructor via real-time channel.

## C8. API Service (REST + Real-time)
- REST endpoints (representative; see services.md for orchestration):
  - `POST /auth/register`, `POST /auth/login`, `GET /me`
  - `GET /templates`, `POST /configurations`, `PUT /configurations/{id}`, `POST /configurations/{id}/apply`, `POST /configurations/{id}/save-as-template`
  - `GET /exercises/{id}`, `PUT /exercises/{id}/placements`, `POST /exercises/{id}/submit`, `GET /exercises/{id}/attempts/{attemptId}/feedback`, `POST /exercises/{id}/verify`, `POST /exercises/{id}/resubmit`
  - `GET /students/{id}/history`, `GET /attempts/{id}`, `POST /attempts/{id}/reflection`, `GET /exercises/{id}/results`
  - `POST /sessions`, `POST /sessions/{id}/join`, `GET /sessions/{id}/progress`, `POST /sessions/{id}/end`
- Real-time: `subscribe(sessionId)` / server `publish(progress)` over WebSocket/AppSync.
