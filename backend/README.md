# ProcessCanvas Backend (Python 3.12)

Modular monolith deployed as a single AWS Lambda function behind API Gateway. All modules share the same DynamoDB client and auth layer — no microservices, no separate deployables.

## Layout

```
src/
├── api/
│   ├── lambda_handler.py       AWS Lambda entry point (handler)
│   ├── app.py                  Route dispatcher + domain orchestration
│   └── router.py               Path → function mapping
├── identity/                   U1: Registration, login, join codes, enrollment
│   ├── service.py
│   └── models.py
├── authoring/                  U2: Exercise configuration, templates, versioning
│   ├── service.py
│   ├── models.py
│   └── seed_templates.py       Built-in real-estate-development template
├── exercise/                   U3: Exercise delivery + scoring
│   ├── models.py               Placement, StudentExerciseState, Attempt
│   ├── service.py              Submit / resubmit / lock logic
│   └── scoring/
│       └── scoring.py          Pure scoring engine (no I/O — fully tested)
├── results/                    U4: History, attempt detail, class results
│   └── service.py
├── live_session/               U5: Live session REST + WebSocket handler
│   └── service.py
└── shared/
    ├── types.py                Phase enum, Role, Principal
    ├── errors.py               AppError, ValidationError, NotFoundError, etc.
    ├── auth.py                 Token verification helpers
    └── dynamo.py               DynamoDB client wrapper

tests/
├── test_scoring.py             Scoring algorithm unit tests (18 tests)
├── test_identity.py            Auth rules unit tests (2 tests)
└── test_authoring.py           Authoring validation unit tests (2 tests)

scripts/
├── smoke_test.sh               Full E2E test against deployed API
└── probe.sh                    Quick API probe for debugging
```

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest -q
# Expected: 22 passed
```

## Scoring Algorithm

`exercise/scoring/scoring.py` is **pure Python with no I/O** — all inputs and outputs are in-memory data structures. 

```
score_percent = (sum of earned weights across all cards) / (sum of max weights) × 100
```

Per card:
- **CORRECT** — placed in the phase with the highest weight for this activity
- **PARTIAL** — placed in a phase with positive but non-maximum weight
- **INCORRECT** — placed in a phase with zero weight

Cards can be placed in multiple phases. Extra placements in zero-weight phases don't add to the score but also don't subtract. Credit is capped at the card's maximum weight.

## Custom Phase Support

The scoring engine was built for the 3 canonical phases (PLANNING, CONSTRUCTION, OPERATIONS). Exercises can now use custom phase names (e.g. "Pre-Development", "Due Diligence"). Custom phases are dynamically registered into the Phase enum at runtime in `app.py:_make_custom_phase()`.

## Deployment

The backend is bundled as a Lambda ZIP from inside the `backend/` directory:

```bash
cd backend
zip -r /tmp/lambda.zip src/ -x "**/__pycache__/*" -x "**/*.pyc" -x "tests/*"
aws lambda update-function-code \
  --function-name <function-name> \
  --zip-file fileb:///tmp/lambda.zip \
  --region us-east-1
```

> ⚠️ Always zip from inside `backend/` — the Lambda handler is `src.api.lambda_handler.handler`. Zipping from the repo root produces `backend/src/...` paths which breaks the import.

## Environment Variables (injected by CDK)

| Variable | Description |
|---|---|
| `USER_POOL_ID` | Cognito User Pool ID |
| `USER_POOL_CLIENT_ID` | Cognito App Client ID |
| `ASSET_BUCKET` | S3 bucket name |
| `INSTRUCTOR_ACCESS_CODE` | Gate code for instructor registration |
| `TABLE_USERS` | DynamoDB Users table name |
| `TABLE_ENROLLMENTS` | DynamoDB Enrollments table name |
| `TABLE_JCODES` ... | (one env var per table, all set by CDK) |
