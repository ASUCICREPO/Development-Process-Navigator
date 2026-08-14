# Architecture — Development Process Navigator

## Overview

The Development Process Navigator is a fully serverless application on AWS. There are no always-on servers — all compute runs on-demand via Lambda, all data lives in DynamoDB, and the frontend is a static Next.js export served from Amplify CDN.

---

## System Diagram

```
                    ┌──────────────────────────────────────────┐
                    │          AWS Amplify Hosting              │
                    │     Next.js 14 Static Export (CDN)       │
                    │                                          │
                    │  ┌────────────┐  ┌──────────────────┐   │
                    │  │ Instructor │  │     Student      │   │
                    │  │     UI     │  │       UI         │   │
                    │  └────────────┘  └──────────────────┘   │
                    └─────────────┬────────────────────────────┘
                                  │
                    ┌─────────────▼────────────────┐
                    │        User Browser           │
                    │   (localStorage token/role)   │
                    └────────┬─────────────────────────────────────┘
                             │ REST/HTTPS
                   ┌─────────▼──────┐
                   │  API Gateway   │
                   │  REST API      │
                   │  + Cognito     │
                   │  Authorizer    │
                   └────────┬───────┘
                            │
                   ┌────────▼───────┐
                   │ Lambda         │
                   │ REST Handler   │
                   │ (Python 3.12)  │
                   │ 29s timeout    │
                   └────────┬───────┘
                            │                     │
                   ┌────────▼─────────────────────▼──────────┐
                   │           DynamoDB (12 Tables)           │
                   │           on-demand billing              │
                   └──────────────────────────────────────────┘
                            │
              ┌─────────────┼──────────────────┐
              │             │                  │
     ┌────────▼──────┐  ┌───▼────┐   ┌────────▼────────┐
     │   Cognito     │  │   S3   │   │  CloudWatch     │
     │  User Pool    │  │ Assets │   │     Logs        │
     │ (Auth + RBAC) │  │       │   │ (1-month retain) │
     └───────────────┘  └────────┘   └─────────────────┘
```

---

## AWS Services

| Service | Configuration | Purpose |
|---|---|---|
| **AWS Amplify Hosting** | Static hosting, auto-deploy on push to `main` | Serves Next.js static export via CloudFront CDN |
| **Amazon API Gateway (REST)** | Cognito authorizer, CORS enabled, `prod` stage | All REST endpoints — auth, exercise, scoring, results |
| **AWS Lambda — REST** | Python 3.12, 128 MB, 29s timeout | API dispatcher for all REST routes |
| **Amazon Cognito User Pool** | Self-signup, email login, custom `role` attribute | Authentication + RBAC (Instructor / Student) |
| **Amazon DynamoDB** | 12 tables, PAY_PER_REQUEST billing | All application data |
| **Amazon S3** | Private bucket, S3-managed encryption, CORS | Asset/upload storage |
| **Amazon CloudWatch Logs** | 1-month retention | Lambda execution logs |
| **AWS CDK (IaC)** | Single stack `ProcessCanvasStack`, TypeScript | All infrastructure as code |

---

## Backend — Modular Monolith

The backend is a single Python Lambda deployment package structured as a modular monolith. All modules share DynamoDB and the same auth layer; there are no microservices or separate deployables.

```
backend/src/
├── api/
│   ├── lambda_handler.py     # AWS Lambda entry point
│   ├── app.py                # Route dispatcher + domain orchestration
│   └── router.py             # Path → handler mapping
├── identity/                 # U1: Auth, registration, join codes, enrollment
├── authoring/                # U2: Exercise configuration, templates, versioning
├── exercise/
│   ├── models.py             # Placement, StudentExerciseState, Attempt
│   ├── service.py            # Submit, resubmit, lock logic
│   └── scoring/
│       └── scoring.py        # Pure scoring engine (no I/O — fully unit tested)
├── results/                  # U4: History, attempt detail, class results
└── shared/
    ├── types.py              # Phase enum, Role, Principal
    ├── errors.py             # AppError, ValidationError, NotFoundError, etc.
    ├── auth.py               # Token verification helpers
    └── dynamo.py             # DynamoDB client wrapper
```

### Request Flow (REST)

```
API Gateway → Lambda (lambda_handler.py)
           → app.py dispatch(method, path, body, principal)
           → domain function (e.g. submit, get_exercise, get_history)
           → DynamoDB read/write
           → JSON response → API Gateway → Browser
```

### Scoring Algorithm

The scoring module (`exercise/scoring/scoring.py`) is **pure Python with no I/O**:

1. **Q1** — Earned/max ratio: `score_percent = total_earned / denominator × 100`
2. **Q2** — Card classification: primary phase → CORRECT, non-primary positive weight → PARTIAL, zero weight → INCORRECT
3. **Q3** — Earned per card: sum of placed-phase weights, capped at the card's max — no penalty for placing in extra phases
4. **Q4** — Weakest match: largest (max − earned) gap, used to generate a reflection prompt

### Submit / Resubmit Flow

```
First submission:  attempt_count = 0 → submit() → score → lock attempts (count=1)
Resubmission:      attempt_count = 1 → resubmit() → final score → lock exercise (count=2, locked=True)
After lock:        exercise is read-only; no further submissions accepted
```

---

## Frontend — Next.js Static Export

The frontend is a **client-only** Next.js 14 app (no SSR). All pages are statically exported to `out/` and served from Amplify CDN.

```
frontend/app/
├── page.tsx                  Login / Register (public)
├── layout.tsx                Root layout: NavBar + footer
├── instructor/
│   ├── page.tsx              Instructor dashboard (exercises, stats)
│   ├── exercises/            Exercise creation + management
│   ├── roster/               Student roster (invite / join code)
│   └── results/              Class results + score trends
└── student/
    ├── page.tsx              Student dashboard
    ├── exercise/             Drag-and-drop exercise board (ExerciseBoard)
    ├── history/              Attempt history + detail
    └── scores/               Score overview
```

### Auth Flow

```
Browser → POST /auth/login → Cognito InitiateAuth → idToken (JWT)
        → localStorage: pc_idToken, pc_role, pc_userId
        → All subsequent requests: Authorization: Bearer <idToken>
        → API Gateway validates token against Cognito User Pool
```

Session is stored in `localStorage`. The `useRoleGuard` hook checks role on every protected page and redirects to `/` if unauthenticated or wrong role.

---

## Data Model

### Key Relationships

```
Cognito User (userId)
    │
    ├── Users table (profile: name, email, role)
    │
    ├── [INSTRUCTOR] ──────────────────────────────┐
    │   ├── Configurations (configId)              │
    │   │   └── ConfigurationVersions              │
    │   │         └── Templates (templateId)       │
    │   └── Enrollments (instructorId, studentId)  │
    │                                              │
    └── [STUDENT] ◄─────────────────────────────── ┘
        ├── StudentExerciseState (exerciseId, studentId)
        └── Attempts (studentId, attemptId)
              └── Sessions → SessionParticipants → WsConnections
```

### DynamoDB Tables

| Table | PK | SK | GSI | Notes |
|---|---|---|---|---|
| Users | userId | — | byEmail (email) | Profiles |
| Enrollments | instructorId | studentId | byStudent (studentId) | Class roster |
| JoinCodes | code | — | — | Self-enrollment |
| Configurations | configId | — | byOwner (ownerInstructorId) | Exercise configs |
| ConfigurationVersions | configId | versionNumber | — | Immutable snapshots |
| Templates | templateId | — | byOwner (ownerInstructorId) | Reusable templates |
| Exercises | exerciseId | — | — | Published exercises |
| StudentExerciseState | exerciseId | studentId | — | Draft placements |
| Attempts | studentId | attemptId | byExercise (exerciseId) | Submissions |

---

## API Summary

### Public (no auth)
```
POST /auth/register   { email, password, displayName, role, joinCode?, instructorCode? }
POST /auth/login      { email, password } → { idToken }
```

### Protected — Instructor
```
GET  /templates
POST /configurations                         Create exercise config
PUT  /configurations/{id}                    Update activities/mappings/prompts
POST /configurations/{id}/apply              Publish → exerciseId
GET  /exercises/{id}/detailed-results        Class results
POST /roster                                 Invite student by email
POST /join-codes                             Generate class join code
```

### Protected — Student
```
GET  /exercises                              List available exercises
GET  /exercises/{id}                         Load exercise (activities, phases, placements)
PUT  /exercises/{id}/placements              Save draft
POST /exercises/{id}/submit                  First submission → score + feedback
POST /exercises/{id}/resubmit               Final submission → locks exercise
GET  /students/{id}/history                  Attempt history
GET  /attempts/{id}                          Attempt detail + card feedback
POST /attempts/{id}/reflection               Submit reflection response
```

---

## Security

- All protected routes require a valid Cognito `idToken` in `Authorization: Bearer` header
- API Gateway validates the token against the Cognito User Pool before invoking Lambda
- Role (`INSTRUCTOR` / `STUDENT`) is a custom Cognito attribute set at registration and never mutated
- Instructors can only access their own exercises and roster (ownership scoping in Lambda)
- Students can only read/submit their own exercise states and attempts
- Instructor registration requires a private `INSTRUCTOR_ACCESS_CODE` (Lambda env var)
- S3 bucket is fully private (no public access)
- DynamoDB has no public endpoints — only accessible from Lambda via IAM role

---

## Infrastructure as Code

All resources are defined in a single CDK stack (`ProcessCanvasStack`):

```
infrastructure/
├── bin/processcanvas.ts       CDK app entry point (us-east-1 default)
├── lib/processcanvas-stack.ts All resources: Cognito, DynamoDB, Lambda,
│                              API GW REST, S3, Amplify, IAM, CloudWatch
└── cdk.json                   CDK config
```

Stack outputs:
- `UserPoolId`, `UserPoolClientId`
- `RestApiUrl`
- `AssetBucketName`
- `AmplifyAppId`, `AmplifyDefaultDomain`, `AmplifyBranchUrl`

---

*Arizona State University · W.P. Carey School of Business · ASU AI Cloud Innovation Center*
