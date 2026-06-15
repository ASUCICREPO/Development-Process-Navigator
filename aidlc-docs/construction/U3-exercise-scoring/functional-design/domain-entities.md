# U3 Exercise & Scoring — Domain Entities

Technology-agnostic model for the student exercise and the (pure) scoring sub-module. Configuration
data (activities, per-phase weights, reflection prompts) is sourced from a U2 ConfigurationVersion.

## Entity: Exercise
| Field | Type | Notes |
|---|---|---|
| exerciseId | Id | |
| versionId | Id | references U2 ConfigurationVersion (immutable snapshot) |
| ownerInstructorId | Id | |
| status | enum | Active, Archived |
| createdAt | timestamp | |

## Entity: StudentExerciseState
Tracks a student's in-progress work for an exercise (pre-final).
| Field | Type | Notes |
|---|---|---|
| exerciseId | Id | |
| studentId | Id | |
| placements | List<Placement> | current in-progress placements |
| attemptCount | int | 0, 1 (after first submit), 2 (after resubmit) |
| locked | bool | true after final (resubmit) attempt |

## Entity: Placement
| Field | Type | Notes |
|---|---|---|
| activityId | Id | |
| phases | Set<Phase> | one activity may be placed in multiple phases (US-3.2) |

## Entity: Attempt (Submission)
Immutable record of a submitted attempt.
| Field | Type | Notes |
|---|---|---|
| attemptId | Id | |
| exerciseId | Id | |
| studentId | Id | |
| versionId | Id | configuration version scored against (reproducibility) |
| attemptNumber | int | 1 or 2 |
| isFinal | bool | true for the official/final attempt |
| placementsSnapshot | List<Placement> | frozen at submission |
| scoreResult | ScoreResult | |
| cardFeedback | List<CardFeedback> | |
| weakestMatch | WeakestMatch | |
| reflectionResponse | string? | captured after results (US-3.6) |
| createdAt | timestamp | |

## Value Object: ScoreResult
| Field | Type | Notes |
|---|---|---|
| scorePercent | int (0–100) | earned ÷ max × 100, rounded |
| totalEarned | number | sum of per-activity earned (capped) |
| denominator | number | sum of per-activity max (primary) weight |

## Value Object: CardFeedback
| Field | Type | Notes |
|---|---|---|
| activityId | Id | |
| placedPhases | Set<Phase> | where the student placed it |
| perPhaseStatus | Map<Phase, enum> | Correct / Partial / Incorrect per placed phase |
| earned | number | capped earned weight for this activity |
| max | number | activity's primary (highest) weight |
| explanation | string | partial-credit explanation (from U2 or default) |

## Value Object: WeakestMatch
| Field | Type | Notes |
|---|---|---|
| activityId | Id | activity with the largest (max − earned) gap |
| phase | Phase | the misplaced/weakest phase for that activity |
| reflectionPrompt | string | from U2 (activity-phase) or generic default |

## Relationships
- Exercise(1) — (0..n) StudentExerciseState — (1) Student
- StudentExerciseState(1) — (1..2) Attempt (attempt 1, optional final resubmit)
- Attempt references a U2 versionId for reproducible scoring.
