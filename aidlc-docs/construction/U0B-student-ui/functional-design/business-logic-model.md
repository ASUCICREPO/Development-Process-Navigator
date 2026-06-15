# U0B Student UI — Client-Side Logic Model

Client-side orchestration only; scoring/validation authority lives in U3.

## Client Flows
- **Auth**: register (optional joinCode) / login; store token; enforce role=STUDENT routing.
- **Placement state**: maintain `placements{activityId → Set<phase>}`; support placing one activity into multiple buckets (US-3.2); allow free rearrangement until submitted.
- **Submit gate**: compute `isComplete` (every activity placed ≥1); enable Submit only then (BR-3.3).
- **Resubmit-once**: after first submit, render feedback + highlight incorrect; allow edits; Verify (review) → Resubmit (one time); then lock board.
- **Reflection**: present weakest-match prompt; capture response.
- **Live session**: join via code; complete the standard exercise flow.

## Error Handling
- Incomplete submit attempt → show missing activities (do not call submit).
- 401/expired → silent refresh else login.
- 403 → not authorized.
- Network errors → notify/retry; never show a fabricated score.
