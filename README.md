# ProcessCanvas

An educational web application where instructors author an activity-to-phase alignment exercise
(real-estate-development domain) and students complete a drag-and-drop sorting exercise with
weighted scoring, per-card feedback, a targeted reflection prompt, and a one-time correct-and-resubmit
flow. Supports self-paced and live-classroom use.

## Architecture (serverless on AWS)
- **Frontend**: Next.js (React/TypeScript) on AWS Amplify Hosting — `frontend/`
- **Backend**: Python AWS Lambdas behind Amazon API Gateway (REST) + API Gateway (WebSocket) — `backend/`
- **Data**: Amazon DynamoDB · **Auth**: Amazon Cognito
- **IaC**: AWS CDK (TypeScript) — `infrastructure/`

Modular monolith: backend units are logical modules (`identity`, `authoring`, `exercise` incl.
`scoring`, `results`, `live_session`) behind a shared API layer.

## Repository Layout
```
frontend/         Next.js SPA (instructor + student UIs)
backend/          Python backend (modular monolith) + tests
infrastructure/   AWS CDK app (single stack)
aidlc-docs/        AI-DLC documentation (design/specs; not application code)
```

## Units → Stories
- U1 Identity & Access (US-1.x) · U2 Authoring (US-2.x) · U3 Exercise & Scoring (US-3.x)
- U4 Results & History (US-4.x) · U5 Live Session (US-5.x) · U0A/U0B Frontend UIs

## Getting Started
- Backend: see `backend/README.md`
- Frontend: see `frontend/README.md`
- Infrastructure: see `infrastructure/README.md`
- Build & test instructions: `aidlc-docs/construction/build-and-test/`

> Scope: this is a working skeleton emphasizing correct core logic (scoring, resubmit-once). Some UI
> and infra details are intentionally lean for a first iteration.
