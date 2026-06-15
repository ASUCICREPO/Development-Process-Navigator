# NFR Logical Components — ProcessCanvas (Shared)

Logical/infrastructure components introduced by the NFR design (mapped to concrete AWS services in
Infrastructure Design).

## Edge / Frontend
- **Amplify-Hosted SPA** (AWS Amplify Hosting): hosts and serves the Next.js Instructor + Student UIs (managed build, deploy, and CDN).

## API Edge
- **REST API Gateway**: single entry for REST endpoints; integrates a **Cognito authorizer** for token validation.
- **WebSocket API Gateway**: manages real-time connections for live-session progress.

## Compute (Modular Monolith — Python Lambdas)
- **API/Orchestration handlers**: route REST requests to domain modules; apply authorization.
- **Domain modules**: identity, authoring, exercise (+ pure scoring sub-module), results, live_session.
- **WebSocket handlers**: connect/disconnect/subscribe + progress publisher.

## Cross-Cutting Logical Components
- **AuthN/AuthZ layer**: validates Cognito tokens; enforces role + ownership scoping.
- **Idempotency handler**: dedupes submission/record writes via idempotency keys.
- **Concurrency guard**: DynamoDB conditional writes for resubmit-once/lock transitions.
- **Connection registry**: maps active WebSocket connections to sessions for targeted push.

## Data
- **DynamoDB tables/items** (logical): Users/Enrollments/JoinCodes (U1), Configurations/Versions/Templates (U2), Exercises/StudentState/Attempts (U3/U4), Sessions/Participants/Connections (U5). Final table design in Infrastructure Design.
- **Managed identity store**: Cognito user pool (U1).

## Component-to-NFR Mapping
| Component | NFRs addressed |
|---|---|
| Amplify-Hosted SPA | NFR-P1 (fast load), NFR-U1 |
| Cognito authorizer + AuthZ layer | NFR-SEC1/2/4 |
| Stateless Lambdas + on-demand DynamoDB | NFR-S1/S2, NFR-P2 |
| Idempotency + concurrency guard | NFR-R2, resubmit-once integrity |
| WebSocket API + connection registry | NFR-P3 (real-time progress) |
| Isolated pure scoring | NFR-M2, NFR-R1 |

## Notes
- No queue/cache/circuit-breaker components are introduced at this scale; they can be added later if
  load grows (the stateless design leaves room for this).
