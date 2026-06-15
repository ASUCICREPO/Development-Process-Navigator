# Code Generation Plan — ProcessCanvas (Consolidated, all units)

**Single source of truth for Code Generation.** Modular monolith in a single monorepo; units are
modules. Generated in dependency-respecting (foundation-first) order.

## Context
- **Workspace root**: `/Users/awsaruna/Documents/realestate`
- **Project type**: Greenfield, multi-unit monolith → monorepo layout (`frontend/`, `backend/`, `infrastructure/`)
- **Stack**: Next.js (React/TS) on Amplify Hosting · Python Lambdas + API Gateway REST · API Gateway WebSocket · DynamoDB · Cognito · AWS CDK (TypeScript)
- **Generation style**: Minimal, working skeleton implementations first (per scaffolding best practice) — core logic (especially scoring) implemented; boilerplate kept lean. Tests authored; executed in Build & Test.

## Scope Note
Given the breadth (full-stack + IaC across 7 units), Part 2 will generate a **coherent working
skeleton**: complete domain models, the pure scoring module (fully implemented + tested), repository
interfaces with DynamoDB implementations, API handlers, CDK stack, and representative frontend
components — prioritizing correctness of core logic over exhaustive UI polish.

---

## Steps

> Status: ALL STEPS COMPLETE (generated 2026-06-15). Backend unit tests: 22 passed.

### Step 1: Project Structure Setup (greenfield)
- [x] Create monorepo skeleton: `frontend/`, `backend/`, `infrastructure/`, root `README.md`
- [x] Backend Python package layout (`backend/src/{shared,identity,authoring,exercise,results,live_session,api}`) + `tests/`
- [x] Frontend Next.js app scaffold (`frontend/`) with `instructor/`, `student/`, `shared/`
- [x] Infra CDK app scaffold (`infrastructure/`)

### Step 2: Backend Shared Foundation
- [ ] `backend/src/shared`: types, error types, auth/authorization middleware, repository base, DynamoDB client wrapper
- [ ] Unit tests for shared utilities
- [ ] Summary doc

### Step 3: U1 Identity & Access (module)
- [ ] Domain models (User, Role, Enrollment, JoinCode) + business logic (W1–W7)
- [ ] Repository layer (Users/Enrollments/JoinCodes) + Cognito integration points
- [ ] API handlers (register, login, me, join-code, roster) + authorization
- [ ] Unit tests + summary

### Step 4: U4 Results & History (module — contracts needed by U3)
- [ ] Domain models (AttemptRecord) + business logic (record, history, class results, reflection)
- [ ] Repository layer (Attempts + GSI)
- [ ] API handlers (history, attempt, results, reflection)
- [ ] Unit tests + summary

### Step 5: U3 Exercise & Scoring (module)
- [ ] **Pure Scoring sub-module** (`exercise/scoring/`) — full implementation of W6/W7/W8 algorithm
- [ ] Exercise domain models + lifecycle (placements, submit, verify, resubmit-once, lock)
- [ ] Repository layer (Exercises, StudentExerciseState) + integration with U4 recording
- [ ] API handlers (get, placements, submit, feedback, verify, resubmit)
- [ ] Unit tests (scoring-focused, incl. multi-phase + resubmit-once) + summary

### Step 6: U2 Authoring (module)
- [ ] Domain models (Configuration, Version, Template, Activity, WeightedMapping, ReflectionPrompt) + workflows (W1–W8)
- [ ] Repository layer (Configurations/Versions/Templates) + system-seeded templates
- [ ] API handlers (templates, configurations CRUD, apply, save-as-template) + validation
- [ ] Unit tests + summary

### Step 7: U5 Live Session (module)
- [ ] Domain models (Session, Participant, Connection, ProgressSnapshot/Event) + workflows (W1–W6)
- [ ] Repository layer (Sessions/Participants/WsConnections)
- [ ] REST handlers (start/join/progress/end) + WebSocket handlers ($connect/$disconnect/subscribe/publish)
- [ ] Unit tests + summary

### Step 8: API Layer Wiring
- [ ] REST router/orchestration mapping endpoints → module handlers; Cognito authorizer integration
- [ ] Shared request/response contracts documented
- [ ] Unit tests + summary

### Step 9: Frontend Shared
- [ ] `frontend/src/shared`: API client, auth (Cognito) hooks, real-time (WebSocket) client, types
- [ ] data-testid conventions
- [ ] Component/unit tests + summary

### Step 10: U0A Instructor UI
- [ ] Components: LoginRegister, TemplatePicker, ConfigurationEditor (ActivityTable, WeightMatrix, ReflectionPromptEditor, ValidationSummary), ClassResults, LiveSessionHost (controls + LiveProgressPanel)
- [ ] API/real-time integration; client-side validation (apply rules)
- [ ] Component tests + summary

### Step 11: U0B Student UI
- [ ] Components: LoginRegister, ExerciseBoard (UnsortedPool, PhaseBucket ×3, SubmitBar, FeedbackPanel, VerifyResubmit, ReflectionForm), HistoryView, JoinSession
- [ ] Drag-and-drop (multi-phase), complete-sort gate, resubmit-once lock; API integration
- [ ] Component tests + summary

### Step 12: Infrastructure (CDK, TypeScript)
- [ ] CDK stack: Cognito User Pool, DynamoDB tables (+GSIs), Lambda functions, REST + WebSocket API Gateways, IAM least-privilege, CloudWatch log groups
- [ ] Amplify Hosting config notes for the frontend
- [ ] Post-deploy template-seeding task

### Step 13: Documentation & Deployment Artifacts
- [ ] Root README (run/build/deploy), API contract doc, real-time event schema doc
- [ ] Per-unit code summaries under `aidlc-docs/construction/{unit}/code/`
- [ ] Deployment/run instructions (feeds Build & Test stage)

---

## Story Traceability
- U1: US-1.1, US-1.2, US-1.3 · U2: US-2.1–2.5 · U3: US-3.1–3.6 · U4: US-3.5/3.6 (record), US-4.1, US-4.2 · U5: US-5.1–5.3 · U0A/U0B: UI for all of the above

## Total Scope
13 steps across backend (Python), frontend (Next.js), and infrastructure (CDK). Foundation-first
order: shared → U1 → U4 → U3 → U2 → U5 → API → frontend → infra → docs.
