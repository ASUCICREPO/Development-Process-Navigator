# ProcessCanvas — User Stories

**Organization**: User Journey-Based · **Granularity**: Medium · **Acceptance Criteria**: Given/When/Then
**Scoring detail**: Moderate (behaviors specified; exact scoring math deferred to design) · **Live sessions**: Full

Each story follows INVEST and maps to functional requirements (FR-x) for traceability.

---

## Journey 1: Onboarding & Authentication

### US-1.1 — Register an account
**As** a new user (Instructor or Student), **I want** to register an account **so that** I can access ProcessCanvas.
- **Given** I am an unregistered user, **When** I submit valid registration details and select my role, **Then** my account is created and I can log in.
- **Given** I submit an email already registered, **When** I attempt to register, **Then** I am informed the account exists and am not duplicated.
- *FR: FR-1.1, FR-1.2*

### US-1.2 — Log in and land in my role view
**As** a registered user, **I want** to log in **so that** I see the experience for my role.
- **Given** valid credentials, **When** I log in as an Instructor, **Then** I land on the instructor authoring area.
- **Given** valid credentials, **When** I log in as a Student, **Then** I land on the student exercise area.
- **Given** invalid credentials, **When** I attempt to log in, **Then** I am denied access with a clear message.
- *FR: FR-1.1, FR-1.3*

### US-1.3 — Role-based access protection
**As** the system owner, **I want** instructor-only actions restricted to instructors **so that** student data and authoring stay protected.
- **Given** I am logged in as a Student, **When** I attempt to access an authoring or class-results action, **Then** access is denied.
- **Given** I am logged in as an Instructor, **When** I access authoring and my class results, **Then** access is granted only for my own content.
- *FR: FR-1.4, NFR-5.1, NFR-5.2*

---

## Journey 2: Instructor Authoring

### US-2.1 — Start from a predefined template
**As** an Instructor, **I want** to start a configuration from a real-estate-development template **so that** I don't build from scratch.
- **Given** I am authoring, **When** I choose a predefined template, **Then** its phases, activities, and weighted mappings load into the editable table.
- *FR: FR-2.3, FR-2.1*

### US-2.2 — Edit the configuration table
**As** an Instructor, **I want** to edit phases, activities, and weighted mappings in an in-browser table **so that** the exercise matches my teaching.
- **Given** a loaded configuration, **When** I add/edit/remove an activity, phase, or weight, **Then** the table reflects the change.
- **Given** an activity, **When** I assign it alignment weights to one or more phases, **Then** those weighted mappings are saved on the activity.
- *FR: FR-2.1, FR-2.2*

### US-2.3 — Customize reflection prompts and feedback explanations
**As** an Instructor, **I want** to define reflection prompts and explanation text for weak matches **so that** feedback is meaningful to my students.
- **Given** I am editing a configuration, **When** I add a reflection prompt/explanation for an activity-phase relationship, **Then** it is stored and used in student feedback.
- *FR: FR-2.5, FR-4.3, FR-4.4*

### US-2.4 — Save a configuration for reuse
**As** an Instructor, **I want** to save configurations **so that** I can reuse and edit them later.
- **Given** a valid configuration, **When** I save it, **Then** it persists and appears in my list of configurations.
- **Given** a saved configuration, **When** I reopen it, **Then** all phases, activities, weights, and prompts are restored.
- *FR: FR-2.4, FR-5.1*

### US-2.5 — Apply configuration to generate/refresh the student exercise
**As** an Instructor, **I want** to apply a configuration to the student exercise **so that** students see the current setup.
- **Given** a saved configuration, **When** I apply it, **Then** a student exercise is generated from it.
- **Given** an exercise had prior placements/results, **When** I re-apply a configuration, **Then** prior placements/results for that exercise instance are cleared and previously submitted attempts remain unchanged in history.
- *FR: FR-2.6, NFR-4.2*

---

## Journey 3: Student Exercise

### US-3.1 — View the exercise
**As** a Student, **I want** to see the unsorted activities and phase buckets **so that** I can begin sorting.
- **Given** an applied exercise, **When** I open it, **Then** I see all activity cards in the unsorted pool and the configured phase buckets.
- *FR: FR-3.1*

### US-3.2 — Place activities into phases (including multiple phases)
**As** a Student, **I want** to drag activities into phase buckets, including placing the same activity in multiple phases, **so that** my answer reflects activities that span phases.
- **Given** an activity in the pool, **When** I drag it into a phase bucket, **Then** it appears in that bucket.
- **Given** an activity already placed in one phase, **When** I also place it in another phase, **Then** it appears in both phases.
- **Given** a placed activity, **When** I move it between buckets or back to the pool, **Then** placements update accordingly.
- *FR: FR-3.2, FR-3.3*

### US-3.3 — Submit a complete sort
**As** a Student, **I want** to submit my sort **so that** I get scored.
- **Given** a complete sort, **When** I submit, **Then** the submission is accepted and scoring begins.
- **Given** an incomplete sort, **When** I attempt to submit, **Then** the system clearly indicates what remains before submission is allowed.
- *FR: FR-3.4*

### US-3.4 — Correct incorrect placements and resubmit once
**As** a Student, **I want** to see which placements were incorrect after I submit and fix them in one additional attempt **so that** I can learn by correcting my own mistakes.
- **Given** I have submitted my sort, **When** scoring completes, **Then** the placements I got incorrect are clearly indicated (there is no global reset of all my work).
- **Given** my incorrect placements are indicated, **When** I adjust those activities into different phases, **Then** my revised placements are updated in place.
- **Given** I have revised my placements, **When** I choose **Verify**, **Then** I can review my updated answer before committing to my final submission.
- **Given** I have made my corrections, **When** I **resubmit**, **Then** the system re-scores my revised answer and records it as my final attempt.
- **Given** I have already used my one allowed resubmission, **When** I attempt to submit again, **Then** further resubmission is disabled and my final score and feedback stand.
- *Interpretation note: exactly one correction/resubmission cycle is allowed; the second submission is final. "Verify" is a pre-resubmission review step, not an unlimited correctness check.*
- *FR: FR-3.5, FR-4.2*

### US-3.5 — Receive score and feedback
**As** a Student, **I want** an alignment score with per-card feedback **so that** I understand my performance.
- **Given** a submitted sort, **When** scoring completes, **Then** I see a weighted alignment score.
- **Given** scoring completes, **When** I view results, **Then** each placement is marked correct / partially correct / incorrect with a brief explanation.
- *Note: exact scoring math is defined in design (per Q4 = Moderate).*
- *FR: FR-4.1, FR-4.2, FR-4.3*

### US-3.6 — Reflect on the weakest match
**As** a Student, **I want** a reflection prompt targeting my weakest match **so that** I can deepen my understanding.
- **Given** scored results, **When** results are shown, **Then** the system identifies my weakest match and presents the associated reflection prompt.
- **Given** a reflection prompt, **When** I enter a response, **Then** my reflection is captured and saved.
- *FR: FR-4.4, FR-4.5, FR-5.2*

---

## Journey 4: Results & History

### US-4.1 — View my attempt history
**As** a Student, **I want** to see my past attempts **so that** I can track progress over time.
- **Given** I have submitted attempts, **When** I open my history, **Then** I see each attempt with its score, feedback, and reflection.
- **Given** I open a past attempt, **When** I view it, **Then** its recorded score/feedback is reproducible from stored data and unchanged by later config edits.
- *FR: FR-5.2, FR-5.3, NFR-4.1, NFR-4.2*

### US-4.2 — Instructor views class results
**As** an Instructor, **I want** to view results/history for students in my exercises **so that** I can gauge understanding and target instruction.
- **Given** students have submitted, **When** I open an exercise's results, **Then** I see per-student scores and feedback for my exercise.
- **Given** I am an Instructor, **When** I view results, **Then** I only see students/exercises that belong to me.
- *FR: FR-5.4, FR-1.4, NFR-5.1*

---

## Journey 5: Live Classroom Session

### US-5.1 — Start a live session
**As** an Instructor, **I want** to start a live session for an exercise **so that** my class can take it together.
- **Given** an applied exercise, **When** I start a live session, **Then** a session is created that enrolled students can access concurrently.
- *FR: FR-6.1*

### US-5.2 — Students join and complete the live exercise
**As** a Student, **I want** to join my instructor's live session **so that** I can complete the exercise in class.
- **Given** an active session I'm enrolled in, **When** I join, **Then** I can complete the same exercise as my classmates.
- **Given** I submit during a live session, **When** scoring completes, **Then** my results are recorded against my account.
- *FR: FR-6.2, FR-5.2*

### US-5.3 — Instructor views live progress
**As** an Instructor, **I want** to see live progress during a session **so that** I can adapt my teaching in the moment.
- **Given** an active session, **When** students place/submit, **Then** I can view aggregate/live progress (e.g., who has submitted, distribution of scores).
- *FR: FR-6.3*

---

## Coverage Matrix (Story → Requirements)
| Requirement | Covered by |
|---|---|
| FR-1 Auth & Accounts | US-1.1, US-1.2, US-1.3 |
| FR-2 Instructor Authoring | US-2.1, US-2.2, US-2.3, US-2.4, US-2.5 |
| FR-3 Student Exercise | US-3.1, US-3.2, US-3.3, US-3.4 (correct & resubmit once) |
| FR-4 Scoring/Feedback/Reflection | US-3.5, US-3.6, US-2.3 |
| FR-5 Persistence & History | US-2.4, US-3.6, US-4.1, US-4.2, US-5.2 |
| FR-6 Live Session | US-5.1, US-5.2, US-5.3 |

## Notes
- Scoring math kept abstract here per the Moderate-detail decision; precise weighted-scoring and
  partial-credit formulas will be specified in Functional/NFR design.
- Multi-phase placement (US-3.2) aligns with the configuration model where an activity may map to
  one or more phases with weights.
