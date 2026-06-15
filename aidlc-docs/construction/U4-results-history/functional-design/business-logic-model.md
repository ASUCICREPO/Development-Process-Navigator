# U4 Results & History — Business Logic Model

All actions authorized via U1 (ownership scoping).

## W1: Record Attempt (US-3.5, US-3.6, US-5.2)
1. Input: a completed Attempt (from U3, optionally with sessionId from U5).
2. Persist as an immutable AttemptRecord (append-only).
3. Output: attemptId.

## W2: Save Reflection (US-3.6)
1. Input: attemptId, reflectionResponse.
2. Attach reflection to the AttemptRecord (one-time set after results).

## W3: Get Student History (US-4.1)
1. Input: student token, optional exerciseId.
2. Authorize: requester is the student (own data) or the owning instructor.
3. Return AttemptRecords (newest first) with stored score/feedback/reflection.

## W4: Get Attempt Detail (US-4.1)
1. Input: attemptId.
2. Authorize ownership; return the stored record unchanged (reproducible).

## W5: Get Class Results (US-4.2)
1. Input: instructor token, exerciseId.
2. Authorize: requester owns the exercise.
3. Return per-student final attempts (score, weakest match, submitted-at).

## Edge Cases
- Reflection already set → reject re-edit (immutable) unless product later allows; default: single set.
- Non-owner access → denied (U1).
- Empty history → return empty list.
