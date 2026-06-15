# U0A Instructor UI — Client-Side Logic Model

Client-side orchestration only; all authoritative logic lives in backend units.

## Client Flows
- **Auth**: store token; attach to API calls; enforce role=INSTRUCTOR routing.
- **Authoring state machine**: Draft → (edit) → Valid → Applied. Local validation mirrors U2 (BR-4.1) to enable/disable Apply.
- **Weight editing**: maintain a weights map; clamp inputs to 0–100; mark primary phase (max) visually.
- **Live session**: open real-time subscription on session start; merge ProgressEvents into local snapshot; tear down on end.

## Client-Side Validation (pre-submit)
- Block Apply until validation passes; surface ValidationSummary errors inline.

## Error Handling
- 401/expired token → attempt silent refresh, else route to login.
- 403 → show "not authorized / not owner".
- Network errors → retry/notify; never fabricate success.
