# U5 Live Session — Business Rules

## Hosting & Lifecycle
- BR-5.1: Only the owning instructor may start, monitor, or end a session for their exercise.
- BR-5.2: A session references an Active, applied exercise.
- BR-5.3: Ending a session expires its joinCode and stops new joins/aggregation.

## Joining
- BR-5.4: Students join an Active session via a valid joinCode and must be associated per U1 (enrolled or join-by-code).
- BR-5.5: Invalid/expired/revoked codes or ended sessions reject joins.

## Submissions & Recording
- BR-5.6: Submissions during a session use the standard U3 scoring/resubmit-once flow.
- BR-5.7: Session submissions are recorded via U4 with the sessionId set (counted in aggregates).

## Real-Time Progress (Q3=B)
- BR-5.8: Progress updates (Joined/Submitted/Updated) are pushed to the instructor's real-time subscription.
- BR-5.9: Aggregates (submittedCount, totalParticipants, scoreDistribution) are derived from session participants' final attempts.

## Access Control
- BR-5.10: Progress and control endpoints are instructor-only and ownership-scoped (U1).

## Story Coverage
- US-5.1 → W1, W6 · US-5.2 → W2, W3 · US-5.3 → W4, W5
