# U4 Results & History — Business Rules

## Persistence & Integrity
- BR-4.1: AttemptRecords are append-only and immutable after write.
- BR-4.2: Stored scores/feedback are never recomputed on read; returned exactly as recorded (NFR-4.1).
- BR-4.3: Each record retains its `versionId`; later configuration edits never alter past results (NFR-4.2).
- BR-4.4: Per-student attempt history is retained (full history per requirements Q4=D).

## Access Control (ownership scoping via U1)
- BR-4.5: A student may read only their own AttemptRecords and reflections.
- BR-4.6: An instructor may read records only for exercises they own (their enrolled students).
- BR-4.7: Reflection responses are personal data; access restricted to the owning student and their instructor.

## Reflection
- BR-4.8: A reflection response is captured once per attempt (default single-set).

## Story Coverage
- US-3.5/3.6 (recording) → W1, W2 · US-4.1 → W3, W4 · US-4.2 → W5 · US-5.2 (session recording) → W1
