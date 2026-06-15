# ProcessCanvas Infrastructure (AWS CDK, TypeScript)

Single-stack, single-region serverless infrastructure.

## Resources (ProcessCanvasStack)
- Amazon Cognito User Pool (+ client) — Instructor/Student roles
- DynamoDB tables (on-demand): Users, Enrollments, JoinCodes, Configurations, ConfigurationVersions,
  Templates, Exercises, StudentExerciseState, Attempts, Sessions, SessionParticipants, WsConnections
- AWS Lambda (Python) functions for REST handlers + WebSocket handlers
- Amazon API Gateway (REST) with Cognito authorizer
- Amazon API Gateway (WebSocket) for live-session progress
- CloudWatch log groups; least-privilege IAM

> Frontend is deployed separately via AWS Amplify Hosting (connected to the repo).

## Deploy
```
cd infrastructure
npm install
npx cdk deploy
```

## Post-deploy
- Seed the real-estate-development template into the Templates table (seeding task).
