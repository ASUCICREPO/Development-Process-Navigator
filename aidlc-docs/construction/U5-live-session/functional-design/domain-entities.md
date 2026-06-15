# U5 Live Session — Domain Entities

Manages live classroom sessions and real-time progress (real-time push per Q3=B from Application Design).

## Entity: Session
| Field | Type | Notes |
|---|---|---|
| sessionId | Id | |
| exerciseId | Id | the applied exercise being run live |
| instructorId | Id | host/owner |
| joinCode | string | shareable code for students to join (ties to U1 JoinCode primitive) |
| status | enum | Active, Ended |
| startedAt / endedAt | timestamp | |

## Entity: SessionParticipant
| Field | Type | Notes |
|---|---|---|
| sessionId | Id | |
| studentId | Id | |
| joinedAt | timestamp | |
| submissionStatus | enum | NotStarted, InProgress, Submitted |

## Value Object: ProgressSnapshot
| Field | Type | Notes |
|---|---|---|
| sessionId | Id | |
| submittedCount | int | participants who submitted (final) |
| totalParticipants | int | |
| scoreDistribution | histogram | buckets of final scores |

## Value Object: ProgressEvent
Pushed to the instructor over the real-time channel when participation/scores change.
| Field | Type | Notes |
|---|---|---|
| sessionId | Id | |
| type | enum | Joined, Submitted, Updated |
| snapshot | ProgressSnapshot | current aggregate |

## Relationships
- Instructor(1) — (0..n) Session — (1) Exercise
- Session(1) — (0..n) SessionParticipant — (1) Student
