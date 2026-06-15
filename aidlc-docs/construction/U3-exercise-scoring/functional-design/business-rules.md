# U3 Exercise & Scoring — Business Rules

## Placement Rules
- BR-3.1: A student may place an activity into one or more phases (US-3.2).
- BR-3.2: Placements may be edited freely until the first submission; after the final resubmission the state is locked.

## Submission Rules (Q6=A)
- BR-3.3: Submission requires a **complete sort** — every activity placed in at least one phase. Incomplete submissions are blocked and the missing activities are listed.

## Scoring Rules (Q1=A, Q3=A)
- BR-3.4: `earned(a) = min(max(a), Σ weight(a, placedPhase))`; weight-0 placements add nothing and incur no penalty.
- BR-3.5: `scorePercent = round(totalEarned / denominator × 100)`, where `denominator = Σ max(a)`. If denominator is 0, score is 0.
- BR-3.6: Scoring is deterministic and side-effect free; the same placements + version always yield the same result (reproducibility, NFR-4.1).

## Per-Card Classification (Q2=A)
- BR-3.7: Correct = primary phase (highest weight); Partial = non-primary positive weight; Incorrect = weight 0.

## Weakest Match (Q4=A)
- BR-3.8: Weakest match = activity with the largest `max(a) − earned(a)` gap (tie-break: higher max). The reflection prompt is the U2 prompt for that activity-phase, or a generic default.

## Resubmit-Once Rules (Q5=A, US-3.4)
- BR-3.9: Exactly one resubmission is allowed after the first submission.
- BR-3.10: A verify step lets the student review revised placements before the final resubmission (no new official score is produced by verify).
- BR-3.11: Both attempts are recorded; the final (attempt 2) is the official score. If the student does not resubmit, attempt 1 is final/official.
- BR-3.12: After the final attempt, the exercise state is locked; further submissions are rejected.

## Reproducibility & Ownership
- BR-3.13: Each attempt is scored against, and stores, the configuration `versionId` it was taken on; later config edits never change recorded results (NFR-4.2).
- BR-3.14: Students may act only on their own exercise state/attempts; instructors access via ownership scoping (U1).

## Story Coverage
- US-3.1 → W1 · US-3.2 → W2, BR-3.1 · US-3.3 → W3, BR-3.3 · US-3.4 → W4, W5, BR-3.9..3.12
- US-3.5 → W6, W7, BR-3.4..3.7 · US-3.6 → W8, W9, BR-3.8
