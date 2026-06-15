# Functional Design Plan — U3 Exercise & Scoring

**Unit**: U3 Exercise & Scoring (exercise lifecycle + isolated pure Scoring sub-module)
**Stories**: US-3.1 (view exercise), US-3.2 (place incl. multi-phase), US-3.3 (submit), US-3.4
(correct & resubmit once), US-3.5 (score & feedback), US-3.6 (reflect on weakest match)
**Inputs from U2**: fixed phases; activities with per-phase weights (0–100); per activity-phase
reflection prompts/explanations.

## Execution Checklist (Part 2 will execute these)
- [x] Generate `business-logic-model.md` — exercise lifecycle, submit/resubmit, scoring algorithm
- [x] Generate `business-rules.md` — scoring rules, correctness thresholds, resubmit-once rules
- [x] Generate `domain-entities.md` — Exercise, Placement, Submission/Attempt, CardFeedback, ScoreResult
- [x] Validate coverage of US-3.1..US-3.6

---

## Clarifying Questions

## Question 1: Overall Score Calculation
How should the alignment score be computed from placements? (weights are 0–100 per activity-phase)

A) Earned-over-max ratio — score = (sum of weights earned by the student's placements) ÷ (sum of each activity's maximum/primary weight), shown as 0–100%

B) Primary-match percentage — score = % of activities placed in their highest-weight (primary) phase

C) Points total — raw sum of earned weights (no normalization)

X) Other (please describe after [Answer]: tag below)

[Answer]: A (use defaults)

## Question 2: Per-Card Correctness Classification
How is each placed card classified (for per-card feedback)?

A) Correct = placed in the primary (highest-weight) phase; Partial = placed in a non-primary phase that still has weight > 0; Incorrect = placed in a phase with weight 0

B) Correct = any phase with weight ≥ a threshold; Partial = lower positive weight; Incorrect = weight 0

C) Binary only — Correct (primary phase) vs Incorrect (anything else)

X) Other (please describe after [Answer]: tag below)

[Answer]: A (use defaults)

## Question 3: Multi-Phase Placement Scoring
A student may place the same activity into multiple phases (US-3.2). How is that scored?

A) Earn the weight for each correctly weighted phase the activity is placed in; placing it in a weight-0 phase contributes nothing (no penalty)

B) Like A, but a weight-0 (incorrect) placement applies a penalty that reduces the activity's earned credit

C) Only the student's single best placement for an activity counts

X) Other (please describe after [Answer]: tag below)

[Answer]: A (use defaults)

## Question 4: Weakest Match (for reflection prompt, US-3.6)
How is the "weakest match" identified?

A) The placed card with the largest gap between earned weight and that activity's maximum/primary weight

B) The incorrect placement (weight 0) with the highest-stakes activity (highest primary weight)

C) The activity with the lowest earned ratio

X) Other (please describe after [Answer]: tag below)

[Answer]: A (use defaults)

## Question 5: Resubmit-Once Score Recording (US-3.4)
After the one allowed resubmission, what is recorded?

A) Record both attempts (attempt 1 and final); the final attempt is the official score

B) Record only the final attempt

C) Record both; official score is the higher of the two

X) Other (please describe after [Answer]: tag below)

[Answer]: A (use defaults)

## Question 6: Incomplete Submission Handling (US-3.3)
"Complete sort" means every activity is placed at least once. If a student submits with unplaced activities:

A) Block submission until all activities are placed (show what's missing)

B) Allow submission; unplaced activities count as incorrect (0 earned)

X) Other (please describe after [Answer]: tag below)

[Answer]: A (use defaults)
