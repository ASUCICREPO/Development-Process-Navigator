# Functional Design Plan — U1 Identity & Access

**Unit**: U1 Identity & Access (foundation; auth + authorization)
**Stories**: US-1.1 (register), US-1.2 (login + role view), US-1.3 (role-based access protection)
**Scope**: Technology-agnostic business logic, domain entities, and rules for accounts, roles, and
authorization. (Concrete auth service — e.g., Cognito — is decided in Infrastructure Design.)

## Execution Checklist (Part 2 will execute these)
- [x] Generate `business-logic-model.md` — registration, login, authorization workflows
- [x] Generate `business-rules.md` — validation, role/ownership rules, account lifecycle
- [x] Generate `domain-entities.md` — User, Role, Session/Token, ownership associations
- [x] Validate coverage of US-1.1, US-1.2, US-1.3

---

## Clarifying Questions

## Question 1: Role Assignment at Registration
How is a user's role (Instructor vs Student) determined?

A) Self-select at registration (anyone can register as either role) — simplest

B) Students self-register; Instructor accounts require an invite/registration code

C) Students join via an instructor-provided code; Instructors self-register

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 2: Email Verification
Should new accounts verify their email before use?

A) Yes — require email verification before login

B) No — allow immediate login after registration (simpler for a classroom tool)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 3: Password Policy
What password rules should apply?

A) Standard policy (min length ~8, mix of character types)

B) Minimal (min length only)

C) Delegate entirely to the managed auth provider's default policy

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: Student–Instructor Association
How are students associated with an instructor's exercises/sessions?

A) Open join — students access an exercise/session via a shareable code or link (no pre-built roster)

B) Instructor maintains a roster (adds/invites students) and only enrolled students can access

C) Both — roster optional; join-by-code also supported

X) Other (please describe after [Answer]: tag below)

[Answer]: CONSIDER HAVING EITHER ROSTER OPTION OR JOIN BY CODE

## Question 5: Session/Token Expiry Behavior
How should login sessions behave?

A) Standard expiry with silent refresh while active (typical)

B) Short fixed sessions, re-login on expiry (simpler, less convenient)

C) Delegate to managed auth provider defaults

X) Other (please describe after [Answer]: tag below)

[Answer]: A
