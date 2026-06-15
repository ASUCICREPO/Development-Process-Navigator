# ProcessCanvas — Requirements Document

## Intent Analysis Summary
- **User Request**: Build the ProcessCanvas application (per https://haletruman.github.io/ProcessCanvas/) on AWS, following the AI-DLC process.
- **Request Type**: New Project (greenfield)
- **Scope Estimate**: System-wide (frontend, backend API, persistence, authentication on AWS)
- **Complexity Estimate**: Moderate
- **Requirements Depth**: Standard

## Product Overview
ProcessCanvas is an educational web application. Instructors author an **activity-to-phase
alignment configuration** (which activities belong in which process phase, with per-activity
weighting). Students complete a **drag-and-drop sorting exercise**: they drag activity cards from
an unsorted pool into phase buckets, submit, and receive an **alignment score**, **per-card
feedback**, and a **reflection prompt** targeting their weakest match. The product supports both
asynchronous self-paced use and live classroom sessions. Results are persisted per student.

The reference domain is the **Real Estate Development process** (sample phases: Planning,
Construction, Operations; sample activities such as Site Feasibility Review, Zoning and
Entitlement, Foundation Pour, etc.). The app is configurable **within the real-estate-development
domain**.

## Confirmed Decisions (from clarifying questions)
| # | Topic | Decision |
|---|---|---|
| 1 | Primary goal | Multi-user product: instructors create/save activities, students complete exercises, results stored; also usable as a live classroom tool |
| 2 | Authentication | Both instructors and students have accounts and log in |
| 3 | Config input | In-browser editable table + pick from predefined templates (no CSV file upload) |
| 4 | Persistence | Full persistence: configurations, student submissions, scores, per-student attempt history, and reflection responses |
| 5 | Scoring/feedback | Richer feedback: weighted alignment score + per-card correctness + partial-credit explanations + reflection prompt |
| 6 | Scale | ~100 concurrent users (single classroom / cohort); design for growth but optimize for this scale |
| 7 | Tech/hosting | Serverless-first on AWS (frontend on S3 + AWS Amplify Hosting, API Gateway + Lambda, DynamoDB) |
| 8 | Domain | Real-estate-development focused, configurable within that domain |
| — | Security extension | Not enforced (skipped) |
| — | Resiliency extension | Not enforced (skipped) |
| — | Property-based testing extension | Not enforced (skipped) |

---

## Functional Requirements

### FR-1: Authentication & Accounts
- FR-1.1: The system shall allow users to register and log in with an account.
- FR-1.2: The system shall support two roles: **Instructor** and **Student**.
- FR-1.3: The system shall present a role-appropriate experience after login (instructor authoring tools vs. student exercise view).
- FR-1.4: The system shall restrict instructor-only actions (authoring, viewing class results) to instructor accounts.

### FR-2: Instructor — Activity Configuration Authoring
- FR-2.1: Instructors shall create and edit an activity configuration via an **in-browser editable table**.
- FR-2.2: A configuration shall consist of: a set of **phases** (ordered buckets), a set of **activities** (each with a title and description), and a **weighted mapping** of each activity to one or more phases (alignment weights).
- FR-2.3: Instructors shall be able to start from a **predefined template** (within the real-estate-development domain) and modify it.
- FR-2.4: Instructors shall be able to **save** configurations for reuse and later editing.
- FR-2.5: Instructors shall be able to define/customize **reflection prompts** and feedback explanations associated with weak matches (supports richer feedback in FR-4).
- FR-2.6: Applying/updating a configuration shall regenerate the student exercise and clear prior placements/results for that exercise instance (consistent with the prototype's "Apply" behavior).

### FR-3: Student — Sorting Exercise
- FR-3.1: Students shall see an **unsorted pool** of activity cards and the configured **phase buckets**.
- FR-3.2: Students shall drag and drop activity cards into phase buckets. The **same activity may be placed into multiple phases** (mirroring the configuration model in FR-2.2, where an activity can align to one or more phases). The unsorted pool shall make a placed activity available for placement in additional phases as appropriate.
- FR-3.3: The system shall allow students to move cards between buckets and back to the pool before submitting.
- FR-3.4: Students shall **submit** only a complete sort (all activities placed), or the system shall clearly indicate what remains.
- FR-3.5: The system shall **not** provide a global reset of all placements. Instead, after a student submits, the system shall indicate which placements were incorrect, and the student shall be able to adjust those placements, **verify** (review) their revised answer, and **resubmit exactly once**. The second submission is final; no further resubmissions are allowed. (Free rearrangement of cards between buckets and the pool before the first submission remains available per FR-3.3.)

### FR-4: Scoring, Feedback & Reflection
- FR-4.1: On submission, the system shall compute a **weighted alignment score** based on placements vs. the instructor's weighted mapping.
- FR-4.2: The system shall provide **per-card correctness** feedback (correct / partially correct / incorrect placement).
- FR-4.3: The system shall provide **partial-credit explanations** describing why a placement earned the score it did.
- FR-4.4: The system shall identify the student's **weakest match** and present a targeted **reflection prompt**.
- FR-4.5: The system shall capture the student's **reflection response**.

### FR-5: Persistence & History
- FR-5.1: The system shall persist instructor configurations and templates.
- FR-5.2: The system shall persist each student **submission**, including placements, computed score, per-card feedback, and reflection response.
- FR-5.3: The system shall retain **per-student attempt history** (multiple attempts over time).
- FR-5.4: Instructors shall be able to view results/history for students in their exercises.

### FR-6: Live Classroom Session Support
- FR-6.1: An instructor shall be able to run an exercise as a **live session** that enrolled students can access concurrently.
- FR-6.2: Students in a live session shall complete the same exercise and have results recorded against their accounts.
- FR-6.3: (Desirable) The instructor shall be able to view aggregate/live progress for the session.

---

## Non-Functional Requirements

### NFR-1: Architecture & Hosting
- NFR-1.1: The application shall be built **serverless-first on AWS** (static frontend hosted via **AWS Amplify Hosting backed by S3**; backend via API Gateway + Lambda; data in DynamoDB).
- NFR-1.2: The solution shall scale to zero when idle to minimize cost, given the small expected scale.

### NFR-2: Performance & Scale
- NFR-2.1: The system shall support approximately **100 concurrent users** comfortably (single classroom / cohort), with headroom for growth.
- NFR-2.2: Interactive actions (drag, submit, score) shall feel responsive (sub-second UI feedback; scoring round-trip target < 2s under normal load).

### NFR-3: Usability & Accessibility
- NFR-3.1: The student drag-and-drop interface shall be intuitive and provide clear placement feedback.
- NFR-3.2: The UI shall follow accessibility best practices (keyboard-operable interactions and screen-reader-friendly labels where feasible).

### NFR-4: Data Integrity
- NFR-4.1: Scoring shall be computed and recorded consistently; a submitted attempt's score and feedback shall be reproducible from stored data.
- NFR-4.2: Configuration changes shall not retroactively alter previously submitted attempts' recorded scores.

### NFR-5: Security & Privacy (baseline, extension not enforced)
- NFR-5.1: Authentication shall protect access; instructor data and student results shall only be visible to authorized users (role-based access).
- NFR-5.2: Student reflection responses and history are personal data and shall be access-controlled to the owning student and their instructor.
- Note: The Security **extension** rules were opted out; standard sensible auth/access controls still apply as functional/NFR baseline.

### NFR-6: Maintainability & Testability
- NFR-6.1: Scoring logic shall be implemented as a well-isolated, unit-testable component.
- NFR-6.2: The codebase shall separate frontend, API, and domain/scoring concerns.

---

## Out of Scope (current iteration)
- CSV file upload/parsing (instructors use in-browser table + templates instead).
- Full learning-management features (courses, rosters at registrar scale, gradebook exports, longitudinal analytics dashboards).
- General-purpose multi-domain authoring beyond the real-estate-development domain.
- Single-organization SSO / external identity provider integration.
- Enforced security, resiliency, and property-based-testing extension rule sets.

## Assumptions
- "Small scale" means a single instructor and their classroom/cohort (~100 concurrent users); the architecture should still be cloud-native and growth-tolerant.
- Predefined templates are seeded with real-estate-development content derived from the prototype's sample data.
- Live-session support is lightweight (shared access to an exercise instance), not a real-time collaborative whiteboard.

## Key Requirements Summary
ProcessCanvas will be a serverless AWS web app with instructor and student accounts. Instructors
author real-estate-development activity/phase configurations via an in-browser table (seeded from
templates) and save them. Students complete drag-and-drop sorting exercises and receive a weighted
alignment score, per-card correctness, partial-credit explanations, and a targeted reflection
prompt. All configurations, submissions, scores, attempt history, and reflections are persisted.
The app supports both self-paced and live-classroom use at ~100 concurrent users scale.
