# Development Process Navigator APIs

This document describes the REST API behind Development Process Navigator (internally "ProcessCanvas"), the MRED card-sorting exercise app.

---

## Overview

All application data flows through a single REST API. One Python Lambda (`ApiFn`) handles every route behind Amazon API Gateway. The API covers four areas:

- **Auth**: register and log in through Amazon Cognito.
- **Authoring (instructor)**: pick one of five scenario templates, customize it, and publish it as an exercise.
- **Exercise (student)**: load the board, save drafts, submit, and make one resubmission.
- **Results and roster**: attempt history, class results, and class enrollment.

Scoring is deterministic and happens on the server. The student board never receives the answer weights.

The full route table lives in the `dispatch()` function in `backend/src/api/app.py`. Requests for unknown routes return `404`.

---

## Base URL

```
https://<rest-api-id>.execute-api.<region>.amazonaws.com/prod/
```

Find your deployment's URL in the `RestApiUrl` CloudFormation output:

```bash
aws cloudformation describe-stacks --stack-name ProcessCanvasStack \
  --query "Stacks[0].Outputs[?OutputKey=='RestApiUrl'].OutputValue" --output text
```

**Example:**
```
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
```

---

## Authentication

API Gateway checks every route except `POST /auth/register` and `POST /auth/login` with a **Cognito User Pool authorizer**. Call `POST /auth/login` to get an `idToken`, then send it on every later request. Your role (`INSTRUCTOR` or `STUDENT`) comes from the token's `custom:role` claim, which is set at registration and can't be changed.

### Headers Required
| Header | Description | Required |
|--------|-------------|----------|
| `Authorization` | `Bearer <idToken>` from `POST /auth/login` | Yes (all routes except register/login) |
| `Content-Type` | `application/json` | Yes |

A missing, expired, or invalid token returns `401`. The browser stores the token in `localStorage` as `pc_idToken`.

---

## 1) Auth Endpoints

Public endpoints for creating an account and signing in.

---

#### POST /auth/register — Create an account

- **Purpose**: Creates a Cognito user and a profile in the `Users` table.
  - **Students**: can include a class join code to enroll right away. Any pending email invites for their address become enrollments.
  - **Instructors**: must supply the instructor access code. The deployer sets this code at deploy time; it isn't stored in the repository. If the deployment has no code configured, instructor sign-up is refused.

- **Request body**:
```json
{
  "email": "string - required, must contain @",
  "password": "string - required, at least 8 characters with a digit and a lowercase letter",
  "displayName": "string - optional, defaults to the part of the email before @",
  "role": "string - INSTRUCTOR or STUDENT (default STUDENT)",
  "joinCode": "string - optional, students only, e.g. ASU-1A2B",
  "instructorCode": "string - required for INSTRUCTOR"
}
```

- **Example request**:
```json
{
  "email": "student@example.edu",
  "password": "example123",
  "displayName": "Sample Student",
  "role": "STUDENT",
  "joinCode": "ASU-1A2B"
}
```

- **Response**:
```json
{
  "userId": "string - Cognito sub",
  "role": "string - INSTRUCTOR or STUDENT"
}
```

- **Status codes**:
  - `201 Created` - Account created
  - `400 Bad Request` - Invalid email, short password, or invalid role
  - `403 Forbidden` - Wrong or missing instructor access code, or instructor sign-up not configured
  - `409 Conflict` - An account with this email already exists

---

#### POST /auth/login — Sign in

- **Purpose**: Authenticates with Cognito (`USER_PASSWORD_AUTH`) and returns tokens.

- **Request body**:
```json
{
  "email": "string - required",
  "password": "string - required"
}
```

- **Response**:
```json
{
  "idToken": "string - JWT; send as Authorization: Bearer <idToken>",
  "accessToken": "string - Cognito access token",
  "expiresIn": "number - seconds until expiry"
}
```

- **Status codes**:
  - `200 OK` - Signed in
  - `400 Bad Request` - `{"error": "Invalid email or password."}`

---

#### POST /auth/forgot-password and POST /auth/confirm-reset — Password reset (not reachable)

- **Purpose**: The backend has handlers for both of these, and the login page calls them. However, API Gateway only defines `/auth/register` and `/auth/login` under `/auth`, so these requests get `403 Missing Authentication Token` and never reach the Lambda. To turn password reset on, see the [Modification Guide](./modificationGuide.md#feature-enable-password-reset).
- **Bodies once routed**:
  - forgot-password: `{ "email": "string" }`
  - confirm-reset: `{ "email": "string", "code": "string", "newPassword": "string" }`

---

#### GET /me — Current user

- **Purpose**: Returns the signed-in user's profile.
- **Response**:
```json
{
  "userId": "string",
  "role": "INSTRUCTOR | STUDENT",
  "displayName": "string",
  "email": "string"
}
```

---

## 2) Authoring Endpoints (Instructor)

Instructors start from one of five built-in scenarios: **A** Land Speculation, **B** Master-Planned Community, **C** Finished Lots to Homebuilders, **D** Multi-Tenant Retail, and **E** Residential Condominium. They save the result as a *configuration* and publish it. Publishing freezes the configuration into an unchangeable *version* and creates an *exercise*.

---

#### GET /templates — List scenario templates

- **Purpose**: Lists the five built-in scenario templates (added to the `Templates` table the first time this is called) plus the caller's own templates. Instructor only.
- **Response**:
```json
{
  "templates": [
    { "templateId": "seed-scenario-a", "source": "SYSTEM_SEEDED", "name": "Scenario A — Land Speculation" }
  ]
}
```

---

#### POST /configurations — Create a configuration

- **Purpose**: Creates a draft configuration, copied from a template when `templateId` is given.
- **Request body**:
```json
{
  "name": "string - optional, default 'Untitled configuration'",
  "templateId": "string - optional, e.g. seed-scenario-b"
}
```
- **Response** (`201 Created`):
```json
{
  "configId": "string - UUID",
  "snapshot": "object - full scenario snapshot (stages, activities, rounds, mappings, costCategories)"
}
```
- **Status codes**: `201`, `400` (template not found), `403` (not an instructor)

---

#### GET /configurations/{configId} — Get a configuration

- **Purpose**: Returns a configuration owned by the caller.
- **Path parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `configId` | string | Configuration UUID |

- **Response**:
```json
{ "configId": "string", "name": "string", "status": "Draft", "snapshot": "object" }
```

---

#### PUT /configurations/{configId} — Update a configuration

- **Purpose**: Saves edits to the draft snapshot. The scenario customizer uses this to save the instructor's changes.
- **Request body**: either a full `{ "snapshot": { ... } }`, which replaces the draft, or individual top-level keys, which are merged in. Editable keys are `activities`, `mappings`, `prompts`, `phases`, `rounds`, `stages`, `costCategories`, `scenarioId`, `teachingFocus`, `processCards`, `professionalCards`, `taskCards`, `decisionCards`, and `version`.
- **Response**:
```json
{ "configId": "string", "snapshot": "object - merged snapshot" }
```

---

#### POST /configurations/{configId}/apply — Publish as an exercise

- **Purpose**: Freezes the current snapshot as a new version (`ConfigurationVersions`) and creates an `Exercises` record. Students then load exercises by ID.
- **Response**:
```json
{
  "exerciseId": "string - UUID to share with students",
  "versionId": "string",
  "versionNumber": "number"
}
```

---

#### GET /exercises — List exercises

- **Purpose**:
  - **Instructors**: get the exercises they published.
  - **Students**: get exercises from instructors they're enrolled with, plus any exercise they've already started.
- **Response**:
```json
{
  "exercises": [
    { "exerciseId": "string", "configId": "string", "title": "string", "status": "Active" }
  ]
}
```

---

#### DELETE /exercises/{exerciseId} — Delete an exercise

- **Purpose**: Deletes an exercise the caller owns. Past attempts stay in place.
- **Response**: `{ "ok": true, "exerciseId": "string" }`
- **Status codes**: `200`, `403` (not the owner), `404`

---

## 3) Exercise Endpoints (Student)

A published exercise has up to five rounds plus a budget and schedule step:

| Round | Kind | Cards | Targets | Notes |
|---|---|---|---|---|
| r1 | `SEQUENCE_ORDER` | Process stages | Positions `pos-1`…`pos-8` | Order the 8 stages |
| r2 | `SEQUENCE_PHASES` | Major activities | Stage IDs (`stage-1`…) | A card can go in several stages |
| r3 | `MATCH_TO_ACTIVITY` | Professionals | Activity IDs (`act-1`…) | A card can go in several activities |
| r4 | `MATCH_TO_ACTIVITY` | Tasks / deliverables | Activity IDs | A card can go in several activities |
| r5 | `MATCH_TO_ACTIVITY` | Developer decisions | Activity IDs | Optional; never blocks submission. A card can go in several activities |

Placements use this shape: `{ roundId: { cardId: [targetId, ...] } }`.

---

#### GET /exercises/{exerciseId} — Load the board

- **Purpose**: Returns everything the board needs, plus the caller's saved draft. Mappings and weights are left out.
- **Response** (multi-round exercise):
```json
{
  "exerciseId": "string",
  "version": 2,
  "scenarioId": "B",
  "name": "Scenario B — Master-Planned Community",
  "teachingFocus": "string",
  "stages": [{ "stageId": "stage-1", "title": "Concept & Acquisition", "description": "string", "order": 1 }],
  "activities": [{ "activityId": "act-1", "title": "string", "description": "string", "primaryStage": "stage-1" }],
  "rounds": [{
    "roundId": "r3", "order": 3, "kind": "MATCH_TO_ACTIVITY", "cardType": "PROFESSIONAL",
    "title": "Round 3 — Match the Professionals", "instructions": "string", "optional": false,
    "targetKind": "ACTIVITY", "targets": [{ "id": "act-6", "label": "string" }],
    "cards": [{ "cardId": "pro-civil", "cardType": "PROFESSIONAL", "title": "Civil Engineer", "description": "string" }]
  }],
  "costCategories": ["Acquisition Cost", "Soft Cost", "Hard Cost", "Financing Cost", "Operating Cost", "Selling/Leasing Cost"],
  "roundPlacements": { "r3": { "pro-civil": ["act-6", "act-8"] } },
  "budgetSchedule": { "act-1": { "costCategory": "Soft Cost", "durationDays": "30", "predecessors": [] } },
  "attemptCount": 0,
  "locked": false
}
```
- **Legacy exercises** (`version: 1`, from before the multi-round rework) return `phases`, `activities`, and `placements` instead.

---

#### PUT /exercises/{exerciseId}/placements — Save a draft

- **Purpose**: Saves placements, and optionally the budget and schedule, without scoring.
- **Request body**:
```json
{
  "roundPlacements": "object - { roundId: { cardId: [targetId] } }",
  "budgetSchedule": "object - optional, { activityId: { costCategory, durationDays, predecessors } }"
}
```
- **Response**: `{ "ok": true }`
- **Status codes**: `200`, `409` (exercise locked)

---

#### PUT /exercises/{exerciseId}/budget-schedule — Save the budget and schedule only

- **Request body**: `{ "budgetSchedule": { ... } }`
- **Response**: `{ "ok": true, "budgetSchedule": { ... } }`
- **Status codes**: `200`, `400` (not a multi-round exercise)

---

#### POST /exercises/{exerciseId}/submit — First submission

- **Purpose**: Scores the placements and records attempt 1. Every card in every required round must be placed.
- **Request body**: same as the save-draft call (`roundPlacements`, `budgetSchedule`).
- **Response**:
```json
{
  "attemptId": "string",
  "attemptNumber": 1,
  "isFinal": true,
  "scorePercent": 78,
  "roundResults": [{
    "roundId": "r3", "title": "string", "cardType": "PROFESSIONAL", "kind": "MATCH_TO_ACTIVITY",
    "scorePercent": 72, "totalEarned": 1450, "denominator": 2000,
    "cardResults": [{
      "cardId": "pro-civil", "placedTargets": ["act-6", "act-8"],
      "perTarget": [{ "target": "act-8", "status": "CORRECT", "weight": 100 }],
      "earned": 100, "max": 100
    }],
    "weakest": { "cardId": "string", "target": "string", "gap": 60 }
  }],
  "weakestMatch": { "roundId": "r4", "cardId": "string", "target": "string", "gap": 80 }
}
```
- **Status codes**:
  - `200 OK` - Scored
  - `400 Bad Request` - `Incomplete. Place every card in every round. Missing: {...}`
  - `409 Conflict` - Exercise is locked

---

#### POST /exercises/{exerciseId}/verify — Save revisions between attempts

- **Purpose**: Saves revised placements after attempt 1, without scoring.
- **Request body**: `{ "roundPlacements": { ... } }`
- **Response**: `{ "ok": true, "roundPlacements": { ... } }`
- **Status codes**: `200`, `409` (only allowed after the first submission)

---

#### POST /exercises/{exerciseId}/resubmit — Final submission

- **Purpose**: Scores attempt 2 and locks the exercise for good. Each student gets exactly one resubmission.
- **Request body / response**: same as submit, with `"attemptNumber": 2`.
- **Status codes**: `200`, `400` (incomplete), `409` (already resubmitted or not yet submitted)

---

## 4) Results Endpoints

---

#### GET /students/{studentId}/history — Attempt history

- **Purpose**: Lists a student's attempts. Students can only read their own history.
- **Response**:
```json
{
  "attempts": [{
    "attemptId": "string", "exerciseId": "string", "exerciseTitle": "string",
    "attemptNumber": 1, "isFinal": true, "scorePercent": 78,
    "studentId": "string", "reflectionResponse": null, "createdAt": "ISO-8601", "version": 2
  }]
}
```
- **Status codes**: `200`, `403` (another student's history)

---

#### GET /attempts/{attemptId} — Attempt detail

- **Purpose**: One attempt with full feedback. For multi-round attempts, the response also includes label maps so the review page can show names instead of IDs.
- **Response**: the history row plus `roundResults`, `budgetSchedule`, `weakestMatch`, `activityNames`, `cardTitles`, `targetLabels`, and `correctTargets` (`{ roundId: { cardId: [best targetIds] } }`).
- **Status codes**: `200`, `404`

---

#### POST /attempts/{attemptId}/reflection — Save a reflection

- **Request body**: `{ "response": "string" }`
- **Response**: `{ "ok": true }`
- **Status codes**: `200`, `404`, `409` (reflection already saved)

---

#### GET /exercises/{exerciseId}/results — Final attempts for an exercise

- **Purpose**: Final attempts for an exercise the caller owns, in the same row shape as history.
- **Response**: `{ "results": [ ...history rows ] }`

---

#### GET /exercises/{exerciseId}/detailed-results — Class results table

- **Purpose**: One row per enrolled student showing both attempts, plus class statistics. Used on the instructor Results page.
- **Response**:
```json
{
  "results": [{
    "studentId": "string", "name": "string", "email": "string",
    "attempt1": 62, "attempt2": 81, "change": "up",
    "status": "Completed | Submitted | Not Started"
  }],
  "stats": { "classAverage": 74, "highest": 95, "lowest": 40, "submitted": 18, "total": 22 }
}
```

---

## 5) Roster and Dashboard Endpoints (Instructor)

---

#### GET /roster — List enrolled students

- **Response**:
```json
{
  "roster": [{
    "studentId": "string", "name": "string", "email": "string", "joined": "ISO-8601",
    "exercise": "string", "score": 81,
    "status": "Completed | Submitted | In Progress | Not Started"
  }],
  "totalStudents": 22
}
```

---

#### POST /roster/add — Add a student by email

- **Purpose**: Enrolls a registered student right away. If the email isn't registered yet, the API stores a pending invite and sends an invite email through Amazon SES. The invite turns into an enrollment when that student registers.
- **Request body**: `{ "email": "string" }`
- **Response** (unregistered student):
```json
{ "ok": true, "invited": true, "email": "string", "message": "Invite sent to ... They'll be enrolled automatically when they register." }
```
- **Status codes**: `200`, `400` (invalid email)

---

#### DELETE /roster/{studentId} — Remove a student

- **Response**: `{ "ok": true, "studentId": "string" }`

---

#### POST /join-codes — Create a class join code

- **Purpose**: Creates a self-enrollment code that students enter at registration.
- **Response**: `{ "code": "ASU-1A2B" }`

---

#### GET /instructor/stats — Dashboard statistics

- **Response**:
```json
{
  "studentCount": 22,
  "exerciseCount": 3,
  "recentActivity": [{ "studentName": "string", "action": "submitted Exercise", "exerciseId": "string", "score": 81, "createdAt": "ISO-8601" }]
}
```

---

## 6) Live Session (WebSocket)

**Live sessions were removed from the product in August 2026**, because sharing an Exercise ID with an enrolled roster already met the classroom need. Some pieces are still around:
- **Still deployed**: the stack's WebSocket API (`WsApiUrl` output) and `WsFn` Lambda. `WsFn` points at `src.live_session.ws_handler.handler`, which no longer exists.
- **Still in the code**: `backend/src/live_session/service.py` and the `startSession` / `joinSession` methods in `frontend/src/shared/apiClient.ts`. No page calls them, and `dispatch()` has no `/sessions` routes, so those requests would return `404`.

To bring the feature back, or to remove these leftover resources, see the [Modification Guide](./modificationGuide.md#feature-live-sessions-restore-or-remove).

---

## Response Format

The Lambda returns the JSON body directly (there's no envelope). Every response includes CORS headers (`Access-Control-Allow-Origin: *`).

### Success Response
```json
{ "exerciseId": "…", "scorePercent": 78 }
```

### Error Response
```json
{ "error": "Human-readable message" }
```

Unhandled server errors return `{"error": "Internal error", "detail": "..."}` with status `500`.

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| `400` | Bad Request | Validation failure (invalid email, incomplete submission, invalid JSON) or bad login |
| `401` | Unauthorized | Missing, expired, or invalid Cognito `idToken` (returned by API Gateway) |
| `403` | Forbidden | Wrong role, not the owner, bad instructor access code, or an undefined path under `/auth` (`Missing Authentication Token`) |
| `404` | Not Found | Unknown route, exercise, or attempt |
| `409` | Conflict | Exercise locked, resubmission already used, duplicate account, or reflection already saved |
| `429` | Too Many Requests | API Gateway throttling (see below) |
| `500` | Internal Server Error | Unhandled exception; details are in CloudWatch Logs `/processcanvas/lambda/api` |

---

## Rate Limiting

The stack doesn't set a custom usage plan, so the `prod` stage uses the account-level API Gateway defaults. A deployed stage reported:

- **Requests per second**: 10,000 (steady-state)
- **Burst limit**: 5,000
- **Requests per day**: no daily quota

Lambda concurrency also uses the account's regional limit.

---

## SDK / Client Examples

### JavaScript/TypeScript
```typescript
const API = "https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod";

// 1. Log in
const login = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "student@example.edu", password: "example123" }),
});
const { idToken } = await login.json();

// 2. Save a Round 3 draft (a professional can be placed in several activities)
const res = await fetch(`${API}/exercises/${exerciseId}/placements`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
  body: JSON.stringify({ roundPlacements: { r3: { "pro-civil": ["act-6", "act-8"] } } }),
});
const data = await res.json(); // { ok: true }
```

### Python
```python
import requests

API = "https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod"

token = requests.post(
    f"{API}/auth/login", json={"email": "student@example.edu", "password": "example123"}
).json()["idToken"]

exercise = requests.get(
    f"{API}/exercises/{exercise_id}", headers={"Authorization": f"Bearer {token}"}
).json()
print(exercise["name"], [r["roundId"] for r in exercise["rounds"]])
```

### cURL
```bash
curl -X POST "$API/exercises/$EXERCISE_ID/submit" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ID_TOKEN" \
  -d '{ "roundPlacements": { "r3": { "pro-civil": ["act-6", "act-8"] } } }'
```

The repo also includes `backend/scripts/smoke_test.sh`, which runs register, login, publish, submit, and results end to end.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.1 | 2026-11-01 | Cards in Rounds 2–5 can be placed in several columns. Instructor access code is now supplied at deploy time. |
| 2.0 | 2026 | Multi-round exercise (5 rounds + budget/schedule), five scenario templates, round-scoped placements |
| 1.0 | 2026-06 | Initial single-sort exercise API |

---

## Support

For API-related issues or questions:
- Open an issue on the [GitHub repository](https://github.com/ASUCICREPO/Development-Process-Navigator/issues)
- Check Lambda logs: `aws logs tail /processcanvas/lambda/api --follow`
- See the [Architecture Deep Dive](./architectureDeepDive.md) and [Deployment Guide](./deploymentGuide.md)
