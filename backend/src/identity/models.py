"""U1 Identity & Access domain models."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional

from ..shared.types import Role


class EnrollmentSource(str, Enum):
    ROSTER = "ROSTER"
    JOIN_CODE = "JOIN_CODE"


@dataclass
class User:
    user_id: str
    email: str
    display_name: str
    role: Role
    status: str = "Active"


@dataclass
class Enrollment:
    enrollment_id: str
    student_id: str
    instructor_id: str
    source: EnrollmentSource


@dataclass
class JoinCode:
    code: str
    instructor_id: str
    status: str = "Active"           # Active | Expired | Revoked
    expires_at: Optional[str] = None
