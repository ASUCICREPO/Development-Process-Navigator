# U1 Identity & Access — Business Logic Model

Technology-agnostic workflows for registration, login, association, and authorization.

## W1: Instructor Registration (US-1.1)
1. Input: email, password, displayName, role=INSTRUCTOR.
2. Validate email format + uniqueness; validate password against policy (Q3=A).
3. Create User(role=INSTRUCTOR, status=Active). No email verification (Q2=B) — login allowed immediately.
4. Output: userId.

## W2: Student Registration + Association (US-1.1, Q1=C)
1. Input: email, password, displayName, role=STUDENT, and (optionally) a JoinCode.
2. Validate email/password as above; create User(role=STUDENT, status=Active).
3. If a JoinCode is provided and Active/not expired → create Enrollment(source=JOIN_CODE) linking student to the issuing instructor.
4. (Alternatively) An instructor may pre-create the association via roster (see W6), in which case the student is already enrolled on registration.
5. Output: userId (+ enrollment if applicable).

## W3: Login (US-1.2)
1. Input: email, password.
2. Authenticate via managed provider; on success issue an AuthSession (standard expiry, silent refresh — Q5=A).
3. Resolve role; signal the client which role view to load (Instructor vs Student).
4. On failure: reject with a generic invalid-credentials result (no user enumeration).

## W4: Resolve Current User
1. Input: AuthSession token.
2. Validate token (not expired/revoked); return { userId, role }.

## W5: Authorization Check (US-1.3)
1. Input: token, action, resource.
2. Resolve user/role.
3. Apply rules (see business-rules.md): role permission + ownership scoping.
4. Return allow/deny.

## W6: Roster-Based Association (US-1.3 support, Q4)
1. Instructor adds a student to their roster by email (invite).
2. If the student account exists → create Enrollment(source=ROSTER); else hold a pending invite that resolves to an Enrollment when that email registers.

## W7: Join Code Lifecycle
1. Instructor generates a JoinCode (optionally with expiry).
2. Students use it during W2 to associate.
3. Instructor may revoke/expire a code; expired/revoked codes are rejected.

## Error / Edge Scenarios
- Duplicate email on registration → reject (account exists), no duplication.
- Invalid/expired/revoked join code → reject association; student account may still be created (then associated later).
- Expired token on any protected action → unauthorized; client triggers re-login (silent refresh first if available).
- Student with no enrollment → can hold an account but has no instructor content until associated.
