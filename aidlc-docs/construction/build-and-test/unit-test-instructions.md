# Unit Test Execution — ProcessCanvas

## Backend (Python / pytest)
### Run all unit tests
```bash
cd backend
python3 -m pytest -q
```
- **Expected**: `22 passed`.
- **Coverage focus**: scoring algorithm (8), exercise/resubmit-once (5), identity (5), authoring (4).

### Test files
- `tests/test_scoring.py` — perfect score, worked example, multi-phase cap, no-penalty, classification, weakest match, unplaced→primary, determinism
- `tests/test_exercise_resubmit.py` — complete-sort gate, submit→resubmit→lock, second-resubmit blocked, double-submit blocked, verify gating
- `tests/test_identity.py` — password policy, instructor register, duplicate email, join-by-code, invalid code
- `tests/test_authoring.py` — seed template integrity, validation rules

## Frontend (Next.js / Vitest)
```bash
cd frontend
npm install
npm test
```
- Component tests (e.g., ExerciseBoard submit-gate, WeightMatrix primary-phase) — add under `frontend/src/**/__tests__`.

## Fixing failures
1. Review pytest output (file + assertion).
2. Fix the implicated module under `backend/src/`.
3. Re-run `python3 -m pytest -q` until green.
