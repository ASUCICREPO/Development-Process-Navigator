"""U4 Results & History service: record attempts, retrieve history/class results, reflections."""
from __future__ import annotations

from ..shared.errors import ConflictError, NotFoundError


class ResultsService:
    def __init__(self, attempts):
        self._attempts = attempts  # repo: save, get, list_by_student, list_by_exercise

    def record_attempt(self, attempt) -> str:
        """W1: append-only record of an attempt (immutable)."""
        self._attempts.save(attempt)
        return attempt.attempt_id

    def save_reflection(self, attempt_id: str, response: str) -> None:
        """W2: set reflection once (BR-4.8)."""
        attempt = self._attempts.get(attempt_id)
        if attempt is None:
            raise NotFoundError("Attempt not found.")
        if getattr(attempt, "reflection_response", None):
            raise ConflictError("Reflection already submitted.")
        attempt.reflection_response = response
        self._attempts.save(attempt)

    def get_student_history(self, student_id: str, exercise_id: str | None = None) -> list:
        """W3: newest-first list of a student's attempts."""
        items = self._attempts.list_by_student(student_id)
        if exercise_id:
            items = [a for a in items if a.exercise_id == exercise_id]
        return sorted(items, key=lambda a: a.created_at or "", reverse=True)

    def get_attempt(self, attempt_id: str):
        """W4: reproducible stored record."""
        attempt = self._attempts.get(attempt_id)
        if attempt is None:
            raise NotFoundError("Attempt not found.")
        return attempt

    def get_class_results(self, exercise_id: str) -> list:
        """W5: per-student final attempts for an exercise."""
        items = self._attempts.list_by_exercise(exercise_id)
        return [a for a in items if a.is_final]
