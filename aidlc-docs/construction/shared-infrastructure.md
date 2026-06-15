# Shared Infrastructure — ProcessCanvas

This file summarizes the shared infrastructure used by all units (modular monolith, single CDK stack,
single region). Full detail in `construction/shared/infrastructure-design/`.

## Shared Resources
- **AWS Amplify Hosting** — Next.js SPA (Instructor + Student UIs).
- **Amazon Cognito User Pool** — authentication + roles (Instructor/Student).
- **Amazon API Gateway (REST)** — single REST API with Cognito authorizer.
- **Amazon API Gateway (WebSocket)** — real-time live-session progress.
- **AWS Lambda (Python)** — domain module handlers + WebSocket handlers.
- **Amazon DynamoDB** — all domain tables (on-demand).
- **Amazon CloudWatch** — logs/metrics.
- **AWS CDK (TypeScript)** — single-stack IaC.

## Sharing Strategy
- One backend deployable (modular monolith); units are logical modules sharing the same API Gateway, Cognito pool, and DynamoDB account/tables.
- Per-owner partition keys provide logical multi-tenancy (instructor-scoped data); no separate infra per tenant at this scale.

## Unit → Infrastructure Touchpoints
| Unit | Primary Infra |
|---|---|
| U0A/U0B (UI) | Amplify Hosting; calls REST + WebSocket |
| U1 Identity & Access | Cognito; Users/Enrollments/JoinCodes tables |
| U2 Authoring | Configurations/ConfigurationVersions/Templates tables |
| U3 Exercise & Scoring | Exercises/StudentExerciseState/Attempts tables; pure scoring in Lambda |
| U4 Results & History | Attempts table (+ GSI for class results) |
| U5 Live Session | Sessions/SessionParticipants/WsConnections; WebSocket API |
