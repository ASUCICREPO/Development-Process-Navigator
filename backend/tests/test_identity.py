"""Unit tests for U1 Identity & Access service."""
import pytest

from src.identity.models import JoinCode
from src.identity.service import IdentityService, validate_password
from src.shared.errors import ConflictError, ValidationError
from src.shared.types import Role


class FakeUsers:
    def __init__(self):
        self.by_email = {}
        self.by_id = {}

    def find_by_email(self, email):
        return self.by_email.get(email)

    def save(self, user):
        self.by_email[user.email] = user
        self.by_id[user.user_id] = user

    def get(self, uid):
        return self.by_id.get(uid)


class FakeEnrollments:
    def __init__(self):
        self.items = []

    def save(self, e):
        self.items.append(e)


class FakeJoinCodes:
    def __init__(self):
        self.items = {}

    def get(self, code):
        return self.items.get(code)

    def save(self, jc):
        self.items[jc.code] = jc


def svc():
    return IdentityService(FakeUsers(), FakeEnrollments(), FakeJoinCodes())


def test_password_policy():
    with pytest.raises(ValidationError):
        validate_password("short")
    with pytest.raises(ValidationError):
        validate_password("alllowercase")  # no digit/upper mix
    validate_password("Passw0rd")  # ok


def test_instructor_self_register():
    s = svc()
    u = s.register_instructor("teacher@example.com", "Passw0rd", "Teacher")
    assert u.role == Role.INSTRUCTOR


def test_duplicate_email_rejected():
    s = svc()
    s.register_instructor("dup@example.com", "Passw0rd", "A")
    with pytest.raises(ConflictError):
        s.register_student("dup@example.com", "Passw0rd", "B")


def test_student_registers_and_joins_by_code():
    s = svc()
    instr = s.register_instructor("teacher@example.com", "Passw0rd", "Teacher")
    jc = s.create_join_code(instr.user_id)
    student = s.register_student("stu@example.com", "Passw0rd", "Stu", join_code=jc.code)
    assert student.role == Role.STUDENT
    assert len(s._enrollments.items) == 1
    assert s._enrollments.items[0].instructor_id == instr.user_id


def test_invalid_join_code_rejected():
    s = svc()
    s.register_instructor("teacher@example.com", "Passw0rd", "Teacher")
    with pytest.raises(ValidationError):
        s.register_student("stu@example.com", "Passw0rd", "Stu", join_code="BADCODE")
