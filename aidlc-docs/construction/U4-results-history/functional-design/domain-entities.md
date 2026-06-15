# U4 Results & History — Domain Entities

U4 owns persistence and retrieval of attempts, scores, feedback, and reflections, plus the
instructor/student views. The attempt schema mirrors U3's `Attempt` (the durable record of truth).

## Entity: AttemptRecord (persisted Attempt)
| Field | Type | Notes |
|---|---|---|
| attemptId | Id | |
| exerciseId | Id | |
| studentId | Id | |
| instructorId | Id | owner (for class-results scoping) |
| versionId | Id | configuration version scored against (reproducibility) |
| attemptNumber | int | 1 or 2 |
| isFinal | bool | official attempt flag |
| placementsSnapshot | List<Placement> | frozen |
| scoreResult | ScoreResult | scorePercent, totalEarned, denominator |
| cardFeedback | List<CardFeedback> | frozen feedback |
| weakestMatch | WeakestMatch | |
| reflectionResponse | string? | |
| sessionId | Id? | set if taken in a live session (U5) |
| createdAt | timestamp | |

## View: StudentHistory
Read model: list of a student's AttemptRecords (optionally filtered by exercise), newest first.

## View: ClassResults
Read model for an instructor: per-student final attempts for one of the instructor's exercises
(score, weakest match, submitted-at). Ownership-scoped.

## Notes
- Records are **append-only** and immutable once written (edits create new attempts upstream in U3).
- No recomputation on read — stored values are returned as-is (reproducibility, NFR-4.1/4.2).
