# U1 Identity & Access — Domain Entities

Technology-agnostic domain model. Credential storage/verification is delegated to a managed auth
provider (selected in Infrastructure Design); password hashes are NOT modeled here.

## Entity: User
| Field | Type | Notes |
|---|---|---|
| userId | Id | unique identifier |
| email | string | unique; login identifier |
| displayName | string | shown in UI / results |
| role | Role | Instructor or Student (assigned at registration) |
| status | enum | Active, Disabled |
| createdAt | timestamp | |

## Enum: Role
- `INSTRUCTOR`
- `STUDENT`

## Entity: AuthSession (token)
| Field | Type | Notes |
|---|---|---|
| sessionId | Id | |
| userId | Id | owner |
| issuedAt | timestamp | |
| expiresAt | timestamp | standard expiry |
| refreshable | bool | silent refresh while active (Q5=A) |

## Entity: Enrollment (student ↔ instructor association)
Associates a student with an instructor. Created via roster OR join code (Q4 = both supported).
| Field | Type | Notes |
|---|---|---|
| enrollmentId | Id | |
| studentId | Id | references User(role=Student) |
| instructorId | Id | references User(role=Instructor) |
| source | enum | ROSTER, JOIN_CODE |
| createdAt | timestamp | |

## Entity: JoinCode
Instructor-issued code that students use to self-associate (supports Q1=C and Q4 join-by-code).
| Field | Type | Notes |
|---|---|---|
| code | string | short, shareable, unique while active |
| instructorId | Id | issuer |
| status | enum | Active, Expired, Revoked |
| expiresAt | timestamp? | optional expiry |

> Note: Binding a student to a specific exercise/live-session is referenced by U2 (Authoring) and
> U5 (Live Session) using the Enrollment/JoinCode primitives defined here.

## Relationships
- User(1) — (0..n) AuthSession
- Instructor(1) — (0..n) JoinCode
- Instructor(1) — (0..n) Enrollment — (1) Student
