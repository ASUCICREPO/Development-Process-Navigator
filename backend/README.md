# ProcessCanvas Backend (Python, modular monolith)

## Layout
```
src/
  shared/        types, errors, auth/authorization, DynamoDB client + base repository
  identity/      U1 Identity & Access
  authoring/     U2 Authoring (+ seed templates)
  exercise/      U3 Exercise & Scoring (scoring/ is a pure, isolated module)
  results/       U4 Results & History
  live_session/  U5 Live Session (REST + WebSocket handlers)
  api/           REST router / orchestration
tests/           unit tests (scoring-focused)
```

## Run tests
```
cd backend
pip install -r requirements.txt
pytest -q
```

## Notes
- `exercise/scoring/scoring.py` is pure (no I/O) and fully unit-tested.
- Repositories use a DynamoDB client wrapper; table names come from environment variables.
- Authorization enforces role (Instructor/Student) and ownership scoping.
