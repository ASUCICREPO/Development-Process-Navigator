"""U1 Identity & Access service.

Account creation and association logic. Credential verification is delegated to the managed auth
provider (Cognito) in production; here we model the domain workflows (W1-W7) and rules (BR-1..BR-4).
Q1=C (students join via code; instructors self-register), Q2=B (no email verification),
Q3=A (standard password policy), Q4=both roster + join-code, Q5=A (standard sessions).
"""
from __future__ import annotations

import re
import uuid
from typing import Callable, Optional

from ..shared.errors import ConflictError, ValidationError
from ..shared.types import Role
from .models import Enrollment, EnrollmentSource, JoinCode, User

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_email(email: str) -> None:
    if not _EMAIL_RE.match(email or ""):
        raise ValidationError("Invalid email address.")


def validate_password(password: str) -> None:
    """BR-1.2 standard policy: min length 8 + mix of character types (Q3=A)."""
    if password is None or len(password) < 8:
        raise ValidationError("Password must be at least 8 characters.")
    classes = [bool(re.search(p, password)) for p in (r"[a-z]", r"[A-Z]", r"\d")]
    if sum(classes) < 2:
        raise ValidationError("Password must mix letters and numbers.")


class IdentityService:
    def __init__(self, users, enrollments, join_codes):
        self._users = users              # repo-like: find_by_email, save, get
        self._enrollments = enrollments  # repo-like: save
        self._join_codes = join_codes    # repo-like: get, save

    def register_instructor(self, email: str, password: str, display_name: str) -> User:
        validate_email(email)
        validate_password(password)
        if self._users.find_by_email(email):
            raise ConflictError("An account with this email already exists.")
        user = User(str(uuid.uuid4()), email, display_name, Role.INSTRUCTOR)
        self._users.save(user)
        return user

    def register_student(self, email: str, password: str, display_name: str,
                         join_code: Optional[str] = None) -> User:
        validate_email(email)
        validate_password(password)
        if self._users.find_by_email(email):
            raise ConflictError("An account with this email already exists.")
        user = User(str(uuid.uuid4()), email, display_name, Role.STUDENT)
        self._users.save(user)
        if join_code:
            self.associate_by_code(user.user_id, join_code)
        return user

    def create_join_code(self, instructor_id: str, expires_at: Optional[str] = None) -> JoinCode:
        code = uuid.uuid4().hex[:8].upper()
        jc = JoinCode(code=code, instructor_id=instructor_id, expires_at=expires_at)
        self._join_codes.save(jc)
        return jc

    def associate_by_code(self, student_id: str, code: str) -> Enrollment:
        jc = self._join_codes.get(code)
        if not jc or jc.status != "Active":
            raise ValidationError("Invalid or expired join code.")
        enr = Enrollment(str(uuid.uuid4()), student_id, jc.instructor_id,
                         EnrollmentSource.JOIN_CODE)
        self._enrollments.save(enr)
        return enr

    def add_to_roster(self, instructor_id: str, student_email: str) -> Optional[Enrollment]:
        """Roster invite by email (W6). Resolves to an Enrollment if the student exists."""
        validate_email(student_email)
        student = self._users.find_by_email(student_email)
        if student and student.role == Role.STUDENT:
            enr = Enrollment(str(uuid.uuid4()), student.user_id, instructor_id,
                             EnrollmentSource.ROSTER)
            self._enrollments.save(enr)
            return enr
        # else: a pending invite would be stored to resolve on registration (omitted in skeleton)
        return None
