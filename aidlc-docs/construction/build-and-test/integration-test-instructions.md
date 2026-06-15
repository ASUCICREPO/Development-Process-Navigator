# Integration Test Instructions — ProcessCanvas

Tests interactions between units. Run against a local stack (DynamoDB Local + the API) or a deployed
dev environment.

## Setup
```bash
# Option A: DynamoDB Local via Docker
docker run -p 8000:8000 amazon/dynamodb-local
# Configure backend to point at local endpoint + create tables (use CDK against LocalStack or a setup script)
export AWS_REGION=us-east-1
export DDB_ENDPOINT=http://localhost:8000
```

## Scenarios

### Scenario 1: Authoring → Exercise generation (U2 → U3)
- **Steps**: instructor creates configuration from seed template → apply → assert an exercise + versionId is created.
- **Expected**: exercise references the new version; prior placements cleared.

### Scenario 2: Submit → Scoring → Record (U3 → C5 → U4)
- **Steps**: student places all activities → submit → assert score + per-card feedback returned and an AttemptRecord persisted.
- **Expected**: recorded score matches recomputed pure-scoring result.

### Scenario 3: Correct-and-resubmit-once (U3 + U4)
- **Steps**: submit (attempt 1) → verify → resubmit (attempt 2) → assert state locked, both attempts recorded, final isFinal.
- **Expected**: a third submit/resubmit is rejected (409).

### Scenario 4: Live session (U5 → U3 → U4)
- **Steps**: instructor startSession → student join → student submits → assert progress snapshot increments and a ProgressEvent is published.

### Scenario 5: Authorization & ownership (U1 cross-cutting)
- **Steps**: student attempts an instructor-only action → expect 403; instructor accesses another instructor's results → expect 403.

## Run
```bash
cd backend
python3 -m pytest tests/integration -q   # add integration tests under tests/integration/
```

## Cleanup
```bash
# stop DynamoDB Local container; drop local tables
```
