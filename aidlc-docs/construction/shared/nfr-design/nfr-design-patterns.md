# NFR Design Patterns — ProcessCanvas (Shared)

Patterns that translate the shared NFRs into design, given the serverless stack (Next.js on Amplify
Hosting, Python Lambdas + API Gateway REST, API Gateway WebSocket, DynamoDB, Cognito, CDK).

## Performance Patterns
- **Static/CDN delivery**: Next.js assets hosted on **AWS Amplify Hosting** (which provides the managed CDN) for fast first load.
- **Stateless compute**: Lambdas are stateless; horizontal scaling handled by the platform.
- **Single-table-friendly access**: DynamoDB access patterns designed around primary keys to keep reads/writes O(1) (no scans on hot paths).
- **Pure scoring**: in-memory, deterministic computation — no external calls during scoring (meets < 2s round-trip).

## Scalability Patterns
- **On-demand scaling**: Lambda concurrency + DynamoDB on-demand capacity absorb ~100 concurrent users and bursts.
- **Scale-to-zero**: no always-on servers; cost tracks usage.
- **Idempotent writes**: submission/recording uses idempotency keys to avoid duplicate attempts on retries.

## Reliability / Resilience Patterns (baseline; resiliency extension not enforced)
- **Write-before-confirm**: an attempt is durably persisted (DynamoDB) before the API confirms success (NFR-R2).
- **Optimistic concurrency / conditional writes**: enforce resubmit-once and lock semantics via DynamoDB conditional updates (e.g., only transition attemptCount 1→2 once).
- **Client retry with backoff**: frontend retries transient API failures; never fabricates a score.
- **Token refresh**: silent refresh on expiry; fall back to re-login.

## Security Patterns (baseline)
- **Managed authN**: Cognito-issued tokens validated at API Gateway (authorizer) before Lambda.
- **Role + ownership authorization**: Lambda authorization layer enforces role (Instructor/Student) and ownership scoping on every protected operation.
- **Least-privilege IAM**: each Lambda gets only the DynamoDB/table actions it needs.
- **Transport security**: HTTPS for REST, WSS for WebSocket.
- **Data partitioning**: per-owner keys so queries naturally scope to the requesting user.

## Real-Time Pattern (Live Sessions)
- **WebSocket fan-out**: instructor subscribes to a session topic; on Join/Submit events a Lambda recomputes the aggregate snapshot and pushes a ProgressEvent to the instructor connection.
- **Connection registry**: store active WebSocket connection IDs (DynamoDB) keyed by sessionId for targeted publishing.

## Maintainability Patterns
- **Modular monolith**: backend organized into domain modules (identity, authoring, exercise/scoring, results, live_session) with a thin API layer.
- **Shared contracts**: REST request/response schemas and the real-time event schema documented and versioned across the TS/Python boundary.
- **Isolated pure scoring**: `exercise/scoring/` has no I/O — unit-tested independently.

## Observability (baseline)
- **Structured logging + request IDs** in Lambdas; basic CloudWatch metrics/logs (no formal SLA/alarms per Q5=A, but logs available for debugging).
