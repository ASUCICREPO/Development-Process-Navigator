# U5 Live Session — Business Logic Model

Authorized via U1. Student submissions during a session are scored/recorded through U3 + U4.

## W1: Start Session (US-5.1)
1. Input: instructor token, exerciseId (must be applied/Active and owned by instructor).
2. Create Session(status=Active) with a shareable joinCode (via U1 JoinCode primitive).
3. Output: sessionId, joinCode.

## W2: Join Session (US-5.2)
1. Input: student token, joinCode.
2. Validate session Active and student is associated (enrolled or join-by-code per U1).
3. Create SessionParticipant(submissionStatus=NotStarted); emit ProgressEvent(Joined).
4. Output: session view (the exercise to complete).

## W3: Complete Exercise in Session (US-5.2)
1. Student completes the exercise; submission/scoring flows through U3 (submit/resubmit).
2. Recorded via U4 with sessionId set.
3. Update participant submissionStatus; emit ProgressEvent(Submitted/Updated).

## W4: Get Session Progress (US-5.3)
1. Input: instructor token, sessionId (owner).
2. Return current ProgressSnapshot (submittedCount, total, scoreDistribution).

## W5: Publish Progress (US-5.3)
1. On Join/Submit/Update, recompute snapshot and publish ProgressEvent to the instructor's real-time subscription.

## W6: End Session (US-5.1)
1. Input: instructor token, sessionId (owner).
2. Set status=Ended; expire joinCode; stop accepting joins/submissions for the session.

## Edge Cases
- Join with invalid/expired code or ended session → rejected.
- Non-owner instructor accessing progress/control → denied.
- Student submits after session ended → handled per exercise state (submission tied to exercise; session simply no longer aggregates).
