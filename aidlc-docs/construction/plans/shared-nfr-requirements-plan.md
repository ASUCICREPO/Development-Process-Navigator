# NFR Requirements Plan — ProcessCanvas (Shared / System-Wide)

**Scope**: Because ProcessCanvas is a modular monolith with a single IaC stack, NFRs and tech-stack
choices are shared across all units (U1–U5, U0A, U0B). Builds on requirements NFR-1..NFR-6.
Security/Resiliency/PBT extensions were opted out; baseline NFRs still apply.

## Execution Checklist (Part 2 will execute these)
- [x] Generate `nfr-requirements.md` — scalability, performance, availability, security baseline, reliability, maintainability, usability
- [x] Generate `tech-stack-decisions.md` — concrete technology choices with rationale
- [x] Validate against requirements (~100 concurrent users, serverless-first, Amplify Hosting)

---

## Clarifying Questions

## Question 1: Frontend SPA Framework
What framework for the SPA (Instructor + Student UIs)?

A) React (with TypeScript) — large ecosystem, strong drag-and-drop libraries

B) Vue (with TypeScript)

C) Angular

D) No preference — recommend (would pick React + TypeScript)

X) Other (please describe after [Answer]: tag below)

[Answer]: NextJS

## Question 2: Backend Lambda Runtime / Language
What language/runtime for the API Lambdas?

A) TypeScript on Node.js — shares language with React frontend

B) Python

C) Java

D) No preference — recommend (would pick TypeScript/Node.js)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 3: Infrastructure-as-Code Tool
How should the AWS infrastructure be defined?

A) AWS CDK (TypeScript)

B) AWS SAM

C) Terraform

D) Amplify (Gen 2) — pairs naturally with Amplify Hosting

E) No preference — recommend (would pick AWS CDK in TypeScript)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: Real-Time Technology (Live Sessions)
The live-progress feature uses real-time push. Which technology?

A) API Gateway WebSocket API + Lambda

B) AWS AppSync (GraphQL subscriptions) — managed real-time

C) No preference — recommend (would pick API Gateway WebSocket API to stay REST-aligned)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5: Availability & Performance Targets
What targets should we design to (small scale, resiliency extension opted out)?

A) Best-effort single-region, serverless defaults; responsive UX (scoring round-trip < 2s); no formal SLA

B) Single-region but with basic monitoring/alarms and defined uptime goal (~99.9%)

C) No preference — recommend (would pick A for this scale)

X) Other (please describe after [Answer]: tag below)

[Answer]: A
