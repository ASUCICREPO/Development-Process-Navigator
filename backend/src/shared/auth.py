"""Authorization helpers: role checks and ownership scoping (BR-3.x in U1)."""
from __future__ import annotations

from .errors import ForbiddenError, UnauthorizedError
from .types import Principal, Role


def require_authenticated(principal: Principal | None) -> Principal:
    if principal is None:
        raise UnauthorizedError("Authentication required.")
    return principal


def require_role(principal: Principal | None, role: Role) -> Principal:
    p = require_authenticated(principal)
    if p.role != role:
        raise ForbiddenError(f"Action requires role {role.value}.")
    return p


def require_instructor(principal: Principal | None) -> Principal:
    return require_role(principal, Role.INSTRUCTOR)


def require_student(principal: Principal | None) -> Principal:
    return require_role(principal, Role.STUDENT)


def require_owner(principal: Principal | None, owner_id: str) -> Principal:
    """Ownership scoping: the principal must own the resource."""
    p = require_authenticated(principal)
    if p.user_id != owner_id:
        raise ForbiddenError("You do not have access to this resource.")
    return p


def require_self_or_instructor(principal: Principal | None, student_id: str,
                               owning_instructor_id: str) -> Principal:
    """Students may access their own data; the owning instructor may access it too."""
    p = require_authenticated(principal)
    if p.role == Role.STUDENT and p.user_id == student_id:
        return p
    if p.role == Role.INSTRUCTOR and p.user_id == owning_instructor_id:
        return p
    raise ForbiddenError("You do not have access to this resource.")
