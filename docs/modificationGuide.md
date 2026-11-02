# Project Modification Guide

This guide is for developers who want to extend, customize, or modify Development Process Navigator.

---

## Introduction

This guide explains how to change Development Process Navigator. The codebase has three parts:

- **Frontend**: a Next.js 14 static app in `frontend/`.
- **Backend**: one Python Lambda in `backend/`, organized as a modular monolith.
- **Infrastructure**: a single CDK stack in `infrastructure/`.

Most changes stay within one of these. This guide points you to the exact files for the changes people ask for most.

Read the [Architecture Deep Dive](./architectureDeepDive.md) first for the overall design.

---

## Table of Contents

- [Project Structure Overview](#project-structure-overview)
- [Frontend Modifications](#frontend-modifications)
- [Backend Modifications](#backend-modifications)
- [Adding New Features](#adding-new-features)
- [Changing AI/ML Models](#changing-aiml-models)
- [Database Modifications](#database-modifications)
- [Best Practices](#best-practices)
- [Testing Your Changes](#testing-your-changes)

---

## Project Structure Overview

```
├── frontend/
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.tsx                # Login / Register / Forgot password
│   │   ├── globals.css             # Theme, sidebar, layout classes
│   │   ├── instructor/             # Dashboard, exercises, roster, results
│   │   ├── student/                # Dashboard, exercise, history (+ detail), scores
│   │   └── tutorial/               # Help Center
│   ├── src/
│   │   ├── shared/                 # apiClient, session, types, SidebarBase, InfoIcon, useRoleGuard
│   │   ├── student/RoundsBoard.tsx # Multi-round card-sort board + results screen
│   │   └── instructor/             # ScenarioCustomizer, SubmissionsDashboard, WeightMatrix, ...
│   └── next.config.js              # output: "export"
├── backend/
│   ├── src/
│   │   ├── api/                    # lambda_handler.py (entry), app.py (dispatch + handlers), router.py
│   │   ├── authoring/              # taxonomy.py (cards + weights), seed_templates.py (scenarios A–E)
│   │   ├── exercise/               # rounds.py (multi-round), scoring/scoring.py (pure core)
│   │   ├── identity/  results/  live_session/  shared/
│   └── tests/                      # pytest suite
├── infrastructure/
│   ├── bin/processcanvas.ts        # CDK app entry point
│   └── lib/processcanvas-stack.ts  # All AWS resources
├── deploy.sh                       # Full deploy (CDK + frontend)
└── docs/
```

---

## Frontend Modifications

### Changing the UI Theme

**Location**: `frontend/app/globals.css`

The CSS variables at the top of the file control the brand colors and layout sizes:

```css
:root {
  --asu-maroon: #8C1D40;
  --asu-gold: #FFC627;
  --sidebar-width: 220px;
  --sidebar-collapsed: 48px;
  --header-height: 56px;
}
```

Many components also use inline style objects (a `styles` record at the bottom of each `.tsx` file) with hard-coded colors. In particular, `RoundsBoard.tsx` has `CARD_TYPE_COLOR`, which sets the color for each round. Search for the hex value when you re-theme.

### Adding New Pages

**Location**: `frontend/app/`

1. Create a folder for the route, for example `frontend/app/instructor/reports/`.
2. Add a `page.tsx` that starts with `"use client";`. The app is a static export, so there's no server rendering.
3. Protect the page with `const allowed = useRoleGuard("INSTRUCTOR");` and render nothing until `allowed` is true.
4. Render the sidebar and wrap the content in `<main className="main-content">`. Keep the sidebar as a **sibling** just before `main`, because the CSS uses that order to shift the content when the sidebar collapses.
5. Add a sidebar link in `frontend/src/shared/InstructorSidebar.tsx` or `Sidebar.tsx` (each is a `navItems` array of `{ id, label, icon, href }`).
6. Call the backend through `api` from `frontend/src/shared/session.ts`. Add a method to `ApiClient` in `apiClient.ts` for any new endpoint.

### Modifying Components

**Location**: `frontend/src/`

- **Round board** (`src/student/RoundsBoard.tsx`):
  - `RoundStage` renders the pool and the target columns.
  - `SequenceStage` renders Round 1.
  - `ResultsScreen` and `BudgetScheduleStep` are the last two screens.
- **Reusable cards**: `REUSABLE_CARD_TYPES` (currently `PROFESSIONAL`) decides which rounds keep cards in the pool after placement. To let tasks be reused too, add `"TASK_DELIVERABLE"`.
- **Column help text**: comes from `exercise.stages[].description` and `exercise.activities[].description`, rendered with `<InfoIcon tooltip title color />`.
- **Sidebar**: both roles use `src/shared/SidebarBase.tsx`. The collapsed state is saved in `localStorage` (`pc_sidebarCollapsed`).

---

## Backend Modifications

### Adding New Lambda Functions

You usually **don't** need a new Lambda. Add a route to the existing `ApiFn` instead (see the next section). Add a separate function only for work with different needs, such as a long-running job, a different memory size or timeout, or a different trigger.

**Location**: `backend/src/<module>/` (handler) and `infrastructure/lib/processcanvas-stack.ts` (wiring)

1. Write the handler in Python, inside the existing package so shared imports work:
   ```python
   # backend/src/results/export_handler.py
   import json


   def handler(event, context):
       # Your logic here
       return {"statusCode": 200, "body": json.dumps({"message": "Success"})}
   ```
2. Add it to the stack next to `ApiFn`:
   ```typescript
   const exportFn = new lambda.Function(this, "ExportFn", {
     runtime: lambda.Runtime.PYTHON_3_12,
     handler: "src.results.export_handler.handler",
     code: lambda.Code.fromAsset("../backend"),
     timeout: Duration.minutes(2),
     environment: { ...Object.fromEntries(allTables.map((t) => [`TABLE_${t.node.id.toUpperCase()}`, t.tableName])) },
   });
   attempts.grantReadData(exportFn);
   ```

### Modifying the CDK Stack

**Location**: `infrastructure/lib/processcanvas-stack.ts`

- **Lambda settings** (memory and timeout): `ApiFn` has a 29 s timeout, which matches API Gateway's limit, and 128 MB of memory. Raise `memorySize` if scoring large classes gets slow.
- **Environment variables**: add them to `ApiFn.environment`. **Never** hard-code secrets. Read them from CDK context or the deploy environment, the way `instructorAccessCode` is handled.
- **Outputs**: add a `CfnOutput` for any value the frontend needs, then pass it into the build in `deploy.sh`.
- Run `npx cdk diff --context instructorAccessCode=<code>` before you deploy.

### Adding New API Endpoints

1. **Write the handler** in `backend/src/api/app.py` (or in a domain module that `app.py` calls). Start with an authorization check:
   ```python
   def get_exercise_summary(principal: Principal, exercise_id: str) -> dict:
       _require_role(principal, Role.INSTRUCTOR)
       ex = _exercise_record(exercise_id)
       if ex.get("ownerInstructorId") != principal.user_id:
           raise ForbiddenError("Not the owner of this exercise.")
       return {"exerciseId": exercise_id, "status": ex.get("status")}
   ```
2. **Add a route** in `dispatch()`, before the final `raise NotFoundError`:
   ```python
   if method == "GET" and len(seg) == 3 and seg[0] == "exercises" and seg[2] == "summary":
       return 200, get_exercise_summary(principal, seg[1])
   ```
3. **API Gateway**:
   - **Signed-in routes** need no change, because `/{proxy+}` already forwards them through the Cognito authorizer.
   - **Public routes** (no login) must be added as explicit resources in the stack, the way `auth/register` and `auth/login` are.
4. **Raise errors from `shared/errors.py`** (`ValidationError` 400, `ForbiddenError` 403, `NotFoundError` 404, `ConflictError` 409). `lambda_handler` turns them into `{"error": ...}` responses.
5. Add an `ApiClient` method in the frontend, and document the endpoint in [APIDoc.md](./APIDoc.md).

---

## Adding New Features

### Feature: Enable password reset

The login page already has a **Forgot Password?** flow, and `forgot_password()` and `confirm_reset()` exist in `app.py`. The routes just aren't reachable through API Gateway.

**Files to modify**:
- `infrastructure/lib/processcanvas-stack.ts`
- `backend/src/api/app.py` (only if you change the flow)

**Steps**:
1. Add the public resources next to the existing auth routes:
   ```typescript
   authResource.addResource("forgot-password").addMethod("POST", integration);
   authResource.addResource("confirm-reset").addMethod("POST", integration);
   ```
2. No IAM change is needed. The handlers call Cognito `ForgotPassword` and `ConfirmForgotPassword`, which are public client APIs that use the app client ID, not the Lambda's role.
3. Check that the reset email arrives. Users are created with `email_verified=true`, so Cognito sends the code with its default email sender. That sender has a low daily limit, so set up SES on the User Pool before you rely on it for a whole class.
4. Deploy, then try the full reset flow from the login page.

### Feature: Penalize wrong placements in Round 3

Because cards can be reused in Round 3, a student who drops a professional into every activity still gets full credit. Credit is capped at the card's best weight, and wrong placements cost nothing.

**Files to modify**:
- `backend/src/exercise/scoring/scoring.py` (`_earned_for`)
- `backend/tests/test_scoring.py` and `test_rounds.py`

**Steps**:
1. Decide on the rule. Two options:
   - Score each correct activity out of the sum of the card's weights.
   - Subtract a fixed penalty for each zero-weight placement, with a floor of 0.
2. Change `_earned_for` only for the round types that should use the new rule. `score_targets` is shared by Rounds 2–5 and by the older `score()` wrapper.
3. Update the tests and the scoring description in the [User Guide FAQ](./userGuide.md#q-how-is-my-score-calculated).

### Feature: Add or change a scenario, card, or weight

**Files to modify**:
- `backend/src/authoring/taxonomy.py`: the stages, the 15 major activities, the professional, task, and decision cards, and their activity weights from the Instructor Manual.
- `backend/src/authoring/seed_templates.py`: the `SCENARIOS` dictionary (A–E). Each scenario has an `activity_scale` that drops or reweights activities.

**Steps**:
1. Edit the taxonomy or the scenario.
2. Run `pytest` in `backend/`.
3. Deploy the backend. **Note:** `_ensure_seed_template()` only adds templates that are *missing*. Existing `seed-scenario-*` rows in the `Templates` table aren't updated, so delete those rows, or change the template ID, to pick up your changes.
4. Exercises that are already published keep their frozen version. Publish a new exercise to use the new content.

### Feature: Live sessions (restore or remove)

Live sessions were removed from the product in August 2026. The infrastructure is still deployed: the WebSocket API, `WsFn`, and the `Sessions`, `SessionParticipants`, and `WsConnections` tables. So are `backend/src/live_session/service.py` and the unused `startSession` / `joinSession` client methods.

**To remove the leftovers**:
1. In `processcanvas-stack.ts`, delete the WebSocket API and stage, `WsFn` and its log group, and the three session tables (and remove those tables from `allTables`). Also delete the `WsApiUrl` output and the `NEXT_PUBLIC_WS_URL` build variable.
2. Delete `startSession` and `joinSession` from `apiClient.ts`.
3. Deploy. CloudFormation deletes the resources, including any data in those tables.

**To restore the feature**:
1. Create `backend/src/live_session/ws_handler.py` with `handler(event, context)` handling `$connect`, `$disconnect`, and `$default`.
2. Add `/sessions` routes to `dispatch()` that call `live_session/service.py`.
3. Push progress events to the instructor's connection using the `WS_ENDPOINT` environment variable, and add an instructor page that listens for them.

---

## Changing AI/ML Models

The project doesn't use any AI or ML model. Scoring is deterministic and rule-based. If you add AI features, such as generated feedback on a student's reflection:

### Adding a Bedrock model

**Location**: a new module, for example `backend/src/results/feedback.py`, plus IAM in the stack.

1. Grant the permission in the stack:
   `apiFn.addToRolePolicy(new iam.PolicyStatement({ actions: ["bedrock:InvokeModel"], resources: ["<model ARN>"] }))`.
2. Call it with `boto3.client("bedrock-runtime").converse(modelId=..., messages=[...])`.
3. Put the model ID in an environment variable rather than in code, so you can switch models without changing code.
4. Keep scoring deterministic. Use the model only for explanation text, never to decide the score.

### Modifying Prompts

There are no LLM prompts. The **reflection prompt** students see is built in the frontend (`ResultsScreen` in `RoundsBoard.tsx`) from the `weakestMatch` the scorer returns. Edit the text there.

---

## Database Modifications

### Adding New Tables

1. Define the table in `infrastructure/lib/processcanvas-stack.ts` using the existing helper:
   ```typescript
   const reports = table("Reports", "exerciseId", "createdAt");
   ```
2. Add it to the `allTables` array. That gives `ApiFn` read/write access and an environment variable named `TABLE_REPORTS`, built from the construct ID in uppercase.
3. Use it from Python with `_t("Reports")`, which reads `TABLE_REPORTS`.
4. Deploy with CDK.

### Modifying Schema

DynamoDB has no schema, so new attributes don't need a migration. Keep these in mind:

- **Keys can't be changed**. Changing a table's partition or sort key means creating a new table and copying the data.
- **Add a GSI for new lookups** with `table.addGlobalSecondaryIndex(...)` instead of scanning. Several existing lookups still scan (for example `get_attempt` and roster lookups), and those are good candidates.
- **Some nested data is stored as JSON strings**, such as `roundPlacements`, `roundResults`, and `snapshot`. Change their shape in a backward-compatible way, because old attempts and exercises are still read.
- **Removal policy**: every table uses `RemovalPolicy.DESTROY`. Change it to `RETAIN` before you store data you can't afford to lose.

---

## Best Practices

1. **Test before deploying**: run `pytest` and `npx tsc --noEmit`, and use `cdk synth` or `cdk diff` to check infrastructure changes.
2. **Keep secrets out of the repo**: supply them at deploy time (CDK context or environment variables), the way the instructor access code is handled.
3. **Follow existing patterns**: route through `dispatch()`, check roles with `_require_role`, raise errors from `shared/errors.py`, and keep scoring pure.
4. **Keep weights on the server**: never add `mappings` or weights to the student board response.
5. **Update the docs**: keep [APIDoc.md](./APIDoc.md) and this guide in sync with your changes.
6. **Use version control**: make small, focused commits.

---

## Testing Your Changes

### Local Testing

```bash
# Backend unit tests (pure scoring, rounds, authoring, identity)
cd backend
pip install -r requirements.txt
python3 -m pytest -q

# Frontend type-check and production build
cd frontend
npx tsc --noEmit -p .
npm run build

# Frontend dev server against a deployed API
echo "NEXT_PUBLIC_API_URL=<RestApiUrl without trailing slash>" > .env.local
npm run dev

# Infrastructure
cd infrastructure
npx cdk synth --context instructorAccessCode=<code>
```

### Deployment Testing

```bash
# Backend-only change: update the Lambda code in place (zip from inside backend/)
cd backend && zip -rq /tmp/lambda_update.zip src/ -x "**/__pycache__/*"
aws lambda update-function-code --function-name <ApiFn name> --zip-file fileb:///tmp/lambda_update.zip

# Infrastructure change: faster Lambda-only updates during development
cd infrastructure
npx cdk deploy --hotswap --context instructorAccessCode=<code>
```

See the [Deployment Guide](./deploymentGuide.md#updating-an-existing-deployment) for frontend-only redeploys.

---

## Conclusion

The project is built to be extended. Most features need a new route in `dispatch()`, a method in `ApiClient`, and a page or component in the frontend. Content changes go in `taxonomy.py` and `seed_templates.py`. If you build something useful, please consider contributing it back.

For questions or support, open an issue on the [GitHub repository](https://github.com/ASUCICREPO/Development-Process-Navigator/issues) or contact the ASU AI Cloud Innovation Center team.
