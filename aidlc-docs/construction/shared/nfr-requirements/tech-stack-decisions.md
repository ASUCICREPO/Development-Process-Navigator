# Tech Stack Decisions — ProcessCanvas (Shared)

Decisions from the shared NFR Requirements plan. Applies to all units; concrete AWS resource wiring
is finalized in Infrastructure Design.

| Layer | Decision | Rationale |
|---|---|---|
| Frontend framework | **Next.js (React, TypeScript)** (Q1) | Rich React ecosystem + strong DnD libraries; hosted on AWS Amplify Hosting |
| Frontend hosting | **AWS Amplify Hosting** (backed by S3) | Per earlier infra decision; simple SPA/Next.js deploys + CDN |
| Backend runtime | **Python on AWS Lambda** (Q2) | Team preference; clean fit for the pure scoring module |
| API style | **REST via Amazon API Gateway** (from App Design Q5) | Conventional resource endpoints |
| Real-time | **API Gateway WebSocket API + Lambda** (Q4) | Live-session progress push; stays AWS-native and REST-aligned |
| Data store | **Amazon DynamoDB** (from requirements) | Serverless, scales to zero, fits access patterns |
| Auth provider | **Amazon Cognito** (candidate; finalized in Infra Design) | Managed auth for U1 (registration, login, roles, sessions) |
| IaC | **AWS CDK (TypeScript)** (Q3) | Programmable, single-stack definition |
| Region | **Single region** (Q5) | Small scale; best-effort availability |

## Frontend Architecture Note
- The Next.js app serves the Instructor and Student UIs as a **client application** (client-rendered/static export acceptable). The authoritative backend-for-frontend is the **separate Python API** (API Gateway + Lambda), not Next.js server routes.
- Next.js SSR/server-route features are **optional** and not required for the functional design; if used, they must not duplicate backend authority (scoring/validation stays in the Python backend).

## Cross-Language Note
- Frontend is TypeScript (Next.js); backend is Python; IaC is TypeScript (CDK). Shared contracts
  (API request/response shapes, real-time event schema) will be documented so both sides stay aligned.
