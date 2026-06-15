# Infrastructure Design — ProcessCanvas (Shared)

Maps the logical components to concrete AWS services. Single region, serverless-first, defined with
AWS CDK (TypeScript). No formal SLA (Q5=A).

## Service Mapping
| Logical Component | AWS Service |
|---|---|
| Amplify-Hosted SPA (Next.js) | **AWS Amplify Hosting** (build/deploy + managed CDN) |
| REST API | **Amazon API Gateway (REST)** with Cognito authorizer |
| Real-time channel | **Amazon API Gateway (WebSocket)** |
| Compute (domain modules) | **AWS Lambda** (Python) |
| Identity store | **Amazon Cognito** (User Pool; groups for Instructor/Student) |
| Data store | **Amazon DynamoDB** (on-demand capacity) |
| Secrets/config | **AWS SSM Parameter Store** (non-secret config), env vars |
| Logs/metrics | **Amazon CloudWatch** (logs + basic metrics) |
| IaC | **AWS CDK (TypeScript)**, single stack |

## Identity (Cognito)
- One User Pool; custom attribute `role` (or pool groups `Instructors`/`Students`).
- Instructors self-register (sign-up enabled). Students self-register (role=Student) and associate via JoinCode/roster.
- No email verification required (Q2=B from U1); standard token expiry + refresh (Q5=A from U1).
- API Gateway uses a Cognito authorizer; Lambdas enforce role + ownership.

## DynamoDB Table Design (logical; on-demand)
> Discrete tables per domain for clarity at this scale (single-table optimization is optional later).

- **Users**: PK `userId`; GSI1 `email` (lookup/login support); attrs role, displayName, status.
- **Enrollments**: PK `instructorId`, SK `studentId`; GSI1 PK `studentId` (a student's instructors); attr source.
- **JoinCodes**: PK `code`; attrs instructorId, status, expiresAt; (used by U1 + U5 sessions).
- **Configurations**: PK `configId`; GSI1 `ownerInstructorId`; attrs name, status, payload.
- **ConfigurationVersions**: PK `configId`, SK `versionNumber`; attr immutable snapshot.
- **Templates**: PK `templateId`; GSI1 `ownerInstructorId` (+ source SYSTEM/INSTRUCTOR).
- **Exercises**: PK `exerciseId`; attrs versionId, ownerInstructorId, status.
- **StudentExerciseState**: PK `exerciseId`, SK `studentId`; attrs placements, attemptCount, locked.
- **Attempts**: PK `studentId`, SK `attemptId`; GSI1 PK `exerciseId` (class results); attrs versionId, attemptNumber, isFinal, scoreResult, cardFeedback, weakestMatch, reflection, sessionId?.
- **Sessions**: PK `sessionId`; attrs exerciseId, instructorId, joinCode, status.
- **SessionParticipants**: PK `sessionId`, SK `studentId`; attr submissionStatus.
- **WsConnections**: PK `sessionId`, SK `connectionId` (targeted real-time push); TTL for cleanup.

## Lambda Functions (Python)
- REST handlers grouped by domain module: `identity`, `authoring`, `exercise` (incl. pure `scoring`), `results`, `live_session`.
- WebSocket handlers: `$connect`, `$disconnect`, `subscribe`, `progressPublisher`.
- Least-privilege IAM per function (only the tables/actions it needs).

## Concurrency & Integrity
- Resubmit-once and lock transitions use DynamoDB **conditional writes** (e.g., update only if `attemptCount = 1 AND locked = false`).
- Submission recording uses idempotency keys to avoid duplicate Attempts on retry.

## Security
- HTTPS (REST/Amplify) and WSS (WebSocket).
- Cognito authorizer at API Gateway; Lambda authorization layer enforces role + ownership.
- Per-owner partition keys keep queries naturally scoped.

## Observability
- CloudWatch logs (structured, with request IDs) and basic metrics. No alarms/SLA (Q5=A); logs available for debugging.
