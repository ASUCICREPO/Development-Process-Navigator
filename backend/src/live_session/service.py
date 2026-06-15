"""U5 Live Session service: session lifecycle, join, progress aggregation, real-time publish."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from ..shared.errors import ConflictError, ForbiddenError, ValidationError


@dataclass
class Session:
    session_id: str
    exercise_id: str
    instructor_id: str
    join_code: str
    status: str = "Active"  # Active | Ended


@dataclass
class ProgressSnapshot:
    session_id: str
    submitted_count: int
    total_participants: int
    score_distribution: dict = field(default_factory=dict)


class LiveSessionService:
    def __init__(self, sessions, participants, publisher):
        self._sessions = sessions          # repo: get, save
        self._participants = participants  # repo: save, list_for, get
        self._publisher = publisher        # callable(session_id, event) -> push to instructor

    def start_session(self, instructor_id: str, exercise_id: str) -> Session:
        session = Session(str(uuid.uuid4()), exercise_id, instructor_id,
                          join_code=uuid.uuid4().hex[:6].upper())
        self._sessions.save(session)
        return session

    def join_session(self, student_id: str, join_code: str):
        session = self._sessions.find_by_code(join_code)
        if not session or session.status != "Active":
            raise ValidationError("Session not found or not active.")
        self._participants.save(session.session_id, student_id, status="NotStarted")
        self._publish(session.session_id)
        return session

    def on_submission(self, session_id: str, student_id: str) -> None:
        """Called when a session participant submits; updates + publishes progress."""
        self._participants.save(session_id, student_id, status="Submitted")
        self._publish(session_id)

    def get_progress(self, instructor_id: str, session_id: str) -> ProgressSnapshot:
        session = self._sessions.get(session_id)
        if not session:
            raise ValidationError("Session not found.")
        if session.instructor_id != instructor_id:
            raise ForbiddenError("Not the session owner.")
        return self._snapshot(session_id)

    def end_session(self, instructor_id: str, session_id: str) -> None:
        session = self._sessions.get(session_id)
        if not session:
            raise ValidationError("Session not found.")
        if session.instructor_id != instructor_id:
            raise ForbiddenError("Not the session owner.")
        session.status = "Ended"
        self._sessions.save(session)

    def _snapshot(self, session_id: str) -> ProgressSnapshot:
        parts = self._participants.list_for(session_id)
        submitted = [p for p in parts if p.get("status") == "Submitted"]
        return ProgressSnapshot(session_id, len(submitted), len(parts))

    def _publish(self, session_id: str) -> None:
        snap = self._snapshot(session_id)
        self._publisher(session_id, {"type": "Updated",
                                     "submittedCount": snap.submitted_count,
                                     "totalParticipants": snap.total_participants})
