# Development Process Navigator

An educational web application where instructors author an activity-to-phase alignment exercise
(real-estate-development domain) and students complete a drag-and-drop sorting exercise with
weighted scoring, per-card feedback, a targeted reflection prompt, and a one-time correct-and-resubmit
flow. Supports self-paced and live-classroom use.

## Architecture (serverless on AWS)

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 14 (React/TypeScript) on AWS Amplify Hosting | `frontend/` |
| Backend | Python 3.12 AWS Lambda behind API Gateway (REST + WebSocket) | `backend/` |
| Data | Amazon DynamoDB (12 tables, on-demand) | — |
| Auth | Amazon Cognito (Instructors & Students groups) | — |
| Storage | Amazon S3 (asset uploads) | — |
| IaC | AWS CDK (TypeScript, single stack) | `infrastructure/` |

Modular monolith: backend units are logical modules (`identity`, `authoring`, `exercise` incl.
`scoring`, `results`, `live_session`) behind a shared API layer.

## Repository Layout
```
frontend/           Next.js SPA (instructor + student UIs)
  app/              App Router pages
    instructor/     Instructor dashboard, exercises, roster, session, results
    student/        Student dashboard, exercise board, history, scores
    tutorial/       Help Center page (guides for both roles)
  src/shared/       Shared components (NavBar, Sidebar, InfoIcon, apiClient, session)
backend/            Python backend (modular monolith) + tests
infrastructure/     AWS CDK app (single stack: ProcessCanvasStack)
aidlc-docs/         AI-DLC documentation (design/specs; not application code)
```

## Key Features
- **Instructor**: Create/manage exercises, build process configurations, manage student roster (email invite or join code), run live sessions, view results & history
- **Student**: Complete drag-and-drop ordering exercises, view scores & history, join live sessions
- **Help System**: Built-in Tutorial/Help Center (`/tutorial`) with role-specific guides, contextual info icons (ⓘ) throughout the UI
- **Live Sessions**: Real-time WebSocket-based collaborative exercises

## Units → Stories
- U1 Identity & Access (US-1.x) · U2 Authoring (US-2.x) · U3 Exercise & Scoring (US-3.x)
- U4 Results & History (US-4.x) · U5 Live Session (US-5.x) · U0A/U0B Frontend UIs

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.12+
- AWS CLI configured with appropriate profile
- AWS CDK CLI (`npm install -g aws-cdk`)

### Instructor Access Code
Instructors must enter an access code during registration to prevent unauthorized instructor accounts. The code is set as a Lambda environment variable (`INSTRUCTOR_ACCESS_CODE`) in the CDK stack. Current value: `MRED-2026`.

**To change the access code:**
1. Open `infrastructure/lib/processcanvas-stack.ts`
2. Find `INSTRUCTOR_ACCESS_CODE: "MRED-2026"` and change the value
3. Also update the fallback default in `backend/src/api/app.py` (`os.environ.get("INSTRUCTOR_ACCESS_CODE", "MRED-2026")`)
4. Deploy:
```bash
cd infrastructure
cdk deploy --profile sandbox2025
```
5. Share the new code privately with instructors (email, in-person, etc.)

### Frontend
```bash
cd frontend
npm install
npm run dev        # local development
npm run build      # production build (static export)
```

### Backend
```bash
cd backend
pip install -r requirements.txt
# Runs as Lambda — see backend/README.md for local testing
```

### Infrastructure
```bash
cd infrastructure
npm install
cdk deploy --profile sandbox2025   # deploy to AWS
```

### Deployment
The frontend auto-deploys to AWS Amplify on push to `main`. The backend Lambda is bundled from `backend/` by CDK during `cdk deploy`.

## DynamoDB Tables
| Table | Keys | Purpose |
|-------|------|---------|
| Users | userId | User profiles |
| Enrollments | instructorId, studentId | Class enrollment |
| JoinCodes | code | Self-enrollment codes |
| Configurations | configId | Exercise configurations |
| ConfigurationVersions | configId, versionNumber | Config versioning |
| Templates | templateId | Reusable templates |
| Exercises | exerciseId | Published exercises |
| StudentExerciseState | exerciseId, studentId | Student progress |
| Attempts | studentId, attemptId | Submission history |
| Sessions | sessionId | Live sessions |
| SessionParticipants | sessionId, studentId | Session enrollment |
| WsConnections | sessionId, connectionId | WebSocket connections |

## Build & Test
See `aidlc-docs/construction/build-and-test/` for detailed instructions.

## License
Arizona State University · W.P. Carey School of Business · ASU Cloud Innovation Centre
