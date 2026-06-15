# U1 Identity & Access — Business Rules

## Registration Rules
- BR-1.1: Email must be syntactically valid and unique across all users.
- BR-1.2: Password must meet the standard policy (Q3=A): minimum length ~8 and a mix of character types (upper, lower, digit). (Exact enforcement may be delegated to the managed provider configured to this policy.)
- BR-1.3: Instructors self-register with role=INSTRUCTOR (open). (Q1=C)
- BR-1.4: Students register with role=STUDENT; they associate to an instructor via a valid JoinCode or via instructor roster. (Q1=C, Q4)
- BR-1.5: No email verification is required; accounts are usable immediately after registration. (Q2=B)

## Authentication / Session Rules
- BR-2.1: Login requires valid credentials; failures return a generic error (no user enumeration).
- BR-2.2: Sessions have a standard expiry and support silent refresh while the user is active. (Q5=A)
- BR-2.3: Expired or revoked sessions are unauthorized for all protected actions.

## Role & Authorization Rules
- BR-3.1: Two roles exist: INSTRUCTOR and STUDENT.
- BR-3.2: Instructor-only actions (authoring, applying configurations, viewing class results, starting/monitoring sessions) are denied to students. (US-1.3)
- BR-3.3: **Ownership scoping** — Instructors may access only resources they own (their configurations, exercises, sessions, and the results of their enrolled students).
- BR-3.4: Students may access only their own data (their attempts, history, reflections) and exercises/sessions they are associated with.

## Association Rules (Q4 — both mechanisms)
- BR-4.1: A student–instructor association is represented by an Enrollment with source ROSTER or JOIN_CODE.
- BR-4.2: A JoinCode must be Active and not expired/revoked to create an association.
- BR-4.3: Roster invites by email resolve to an Enrollment upon (or immediately if already) registration.
- BR-4.4: The instructor chooses which mechanism to use per class/exercise; both are supported. *(Interpretation of Q4 answer "either roster or join by code"; confirm if only one mechanism was intended.)*

## Data Integrity / Privacy
- BR-5.1: Personal data (email, student results/reflections) is access-controlled per BR-3.3/BR-3.4.
- BR-5.2: Credentials are never stored or returned in plaintext (delegated to managed provider).

## Story Coverage
- US-1.1 → BR-1.x
- US-1.2 → BR-2.x
- US-1.3 → BR-3.x (+ association via BR-4.x)
