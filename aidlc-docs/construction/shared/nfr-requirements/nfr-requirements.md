# NFR Requirements — ProcessCanvas (Shared / System-Wide)

Derived from requirements NFR-1..NFR-6 and the shared NFR plan answers. Security/Resiliency/PBT
extensions opted out; baseline NFRs below still apply.

## Scalability
- NFR-S1: Support ~100 concurrent users comfortably (single classroom/cohort), with serverless
  components that scale horizontally on demand (Lambda concurrency, DynamoDB on-demand).
- NFR-S2: Scale to near-zero when idle to minimize cost.

## Performance
- NFR-P1: Interactive UI actions (drag, place, navigate) feel responsive (sub-second client feedback).
- NFR-P2: Scoring round-trip (submit → score + feedback) target < 2s under normal load.
- NFR-P3: Real-time live-session progress updates delivered within a few seconds of a student event.

## Availability
- NFR-A1: Best-effort single-region using managed serverless services; no formal SLA (Q5=A).
- NFR-A2: Rely on AWS managed-service durability (DynamoDB, Cognito) for data persistence.

## Security (baseline; extension not enforced)
- NFR-SEC1: Authentication via managed provider (Cognito candidate); role-based authorization (Instructor/Student).
- NFR-SEC2: Ownership scoping — instructors access only their content; students only their own data.
- NFR-SEC3: Transport encryption (HTTPS/WSS) for all client-server traffic.
- NFR-SEC4: Personal data (emails, student results, reflections) access-controlled per role/ownership.

## Reliability
- NFR-R1: Scoring is deterministic and reproducible from stored data (attempts retain configuration versionId).
- NFR-R2: Submissions are recorded atomically; an accepted submission is durably stored before confirming.
- NFR-R3: Graceful error handling on the client (token refresh, clear error messaging, no fabricated results).

## Maintainability & Testability
- NFR-M1: Clear separation: Next.js frontend, Python API (modular monolith), CDK infrastructure.
- NFR-M2: Scoring implemented as an isolated, pure, unit-testable module.
- NFR-M3: Documented shared contracts (REST shapes, real-time event schema) across the TS/Python boundary.

## Usability & Accessibility
- NFR-U1: Intuitive drag-and-drop with clear placement and feedback states.
- NFR-U2: Keyboard-operable interactions and screen-reader-friendly labels where feasible.

## Tech Stack (summary; see tech-stack-decisions.md)
- Next.js (React/TS) on Amplify Hosting · Python Lambdas behind API Gateway (REST) · API Gateway
  WebSocket for real-time · DynamoDB · Cognito (candidate) · AWS CDK (TypeScript), single region.

## Validation Against Requirements
- ✔ ~100 concurrent users (NFR-2.1) · ✔ serverless-first + Amplify Hosting (NFR-1.1) · ✔ responsive
  scoring (NFR-2.2) · ✔ role-based access (NFR-5.1/5.2) · ✔ reproducibility (NFR-4.1/4.2) · ✔ isolated
  scoring (NFR-6.1).
