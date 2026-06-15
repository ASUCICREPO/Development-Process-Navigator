# U3 Exercise & Scoring — Business Logic Model

Technology-agnostic workflows. The Scoring sub-module is a **pure, deterministic** function (no I/O).
Decisions applied: Q1=A (earned/max ratio), Q2=A (primary/partial/zero classification), Q3=A (credit
per correct phase, capped, no penalty), Q4=A (largest earned-vs-max gap), Q5=A (record both; final
official), Q6=A (block incomplete).

## Definitions (from U2 ConfigurationVersion)
- For activity `a`: `weight(a, phase)` ∈ [0,100]; `max(a)` = highest weight across phases (primary phase = argmax).
- `denominator` = Σ over all activities of `max(a)`.

## W1: View Exercise (US-3.1)
1. Load exercise (+ version snapshot): unsorted activities + fixed phases.
2. Return view with any existing in-progress placements and current state (attemptCount, locked).

## W2: Save Placements (US-3.2, US-3.3 prep)
1. Update StudentExerciseState.placements (an activity may appear in multiple phases).
2. Allowed only while not locked.

## W3: Submit (first attempt) (US-3.3 → US-3.5)
1. Validate **complete sort**: every activity placed in ≥1 phase; else block and list missing (Q6=A).
2. Call Scoring (W6) over placements + version.
3. Build CardFeedback + WeakestMatch (W7, W8).
4. Persist Attempt (attemptNumber=1, isFinal=false); set attemptCount=1.
5. Return score + feedback (incorrect cards highlighted).

## W4: Verify Revision (US-3.4)
1. Precondition: attemptCount=1, not locked.
2. Accept revised placements for review; return a review view (no new official scoring — pre-resubmit review only).

## W5: Resubmit (final, once) (US-3.4)
1. Precondition: attemptCount=1, not locked.
2. Validate complete sort (Q6=A).
3. Call Scoring (W6); persist Attempt (attemptNumber=2, isFinal=true).
4. Set attemptCount=2, locked=true. The final attempt is the **official** score (Q5=A); attempt 1 remains recorded.
5. Further submissions are rejected.

## W6: Scoring Algorithm (pure) (US-3.5)
For each activity `a` placed by the student in phase-set `P(a)`:
1. `earned(a) = min( max(a), Σ_{p ∈ P(a)} weight(a, p) )`  — credit per correctly weighted phase, capped at the activity's max; weight-0 phases add 0 (no penalty, Q3=A).
2. `totalEarned = Σ earned(a)`.
3. `scorePercent = round( totalEarned / denominator × 100 )`  (Q1=A). If denominator = 0, score = 0.

## W7: Per-Card Classification (US-3.5, Q2=A)
For each placed phase `p` of activity `a`:
- **Correct** if `p` is the primary phase (`weight(a,p) == max(a)` and max>0).
- **Partial** if `0 < weight(a,p) < max(a)`.
- **Incorrect** if `weight(a,p) == 0`.
- `explanation` = U2 ReflectionPrompt.explanation for (a,p) if present, else a generic default.

## W8: Weakest Match Selection (US-3.6, Q4=A)
1. For each activity, gap = `max(a) − earned(a)`.
2. Weakest = activity with the largest gap (tie-break: higher `max(a)`).
3. `phase` = the placed phase of that activity with the lowest weight (the weakest/incorrect placement).
4. `reflectionPrompt` = U2 prompt for (activity, phase) if present, else generic default.

## W9: Capture Reflection (US-3.6)
1. After results are shown, accept the student's reflection response; store on the Attempt (persisted via U4).

## Hand-off to U4 (Results & History)
- Each persisted Attempt (placements snapshot, scoreResult, cardFeedback, weakestMatch, reflection) is recorded via U4 for history and instructor views.

## Worked Example
- Activity "Foundation Pour": weights { Planning:0, Construction:100, Operations:0 }; max=100.
- Student places it in Construction → earned = min(100, 100) = 100 → Correct.
- Activity "Permit Submission": weights { Planning:70, Construction:30, Operations:0 }; max=70 (primary=Planning).
  - Placed in Construction only → earned = min(70, 30) = 30 → Partial; gap = 40.
  - Placed in Planning + Construction → earned = min(70, 70+30=100) = 70 → full credit (capped).
