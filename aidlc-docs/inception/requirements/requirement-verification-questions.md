# Requirements Clarification Questions — ProcessCanvas

The ProcessCanvas website is a **static single-page prototype**. Building it "in AWS" introduces
decisions about who uses it, what data is saved, and how it scales. Please answer the questions
below by filling in the letter after each `[Answer]:` tag. If none of the options fit, choose the
"Other" option and describe your preference.

---

## Question 1: Primary Goal of the AWS Build
What is the main outcome you want from building this on AWS?

A) A faithful, hosted version of the existing prototype (single-page, in-browser only, no accounts or saved data)

B) A multi-user product where instructors create/save activities and students complete exercises with results stored

C) A classroom tool used live in a session (instructor sets up, students join temporarily, minimal long-term storage)

D) A full learning platform (courses, rosters, gradebook, analytics over time)

X) Other (please describe after [Answer]: tag below)

[Answer]: A multi-user product where instructors create/save activities and students complete exercises with results stored with the ability to use as a classroom tool in a live session.

---

## Question 2: User Roles and Authentication
How should users access the application?

A) No login at all — anyone with the link uses it (instructor and student views are just different pages/modes)

B) Instructors log in; students join via a shared link or code (no student accounts)

C) Both instructors and students have accounts and log in

D) Single-organization SSO (e.g., school/university identity provider)

X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 3: Instructor Configuration Input
How should instructors provide the activity/phase configuration?

A) In-browser editable table only (like the current prototype, no file handling)

B) Upload a CSV file that the system parses

C) Both: upload CSV and edit in-browser

D) Pre-defined templates the instructor picks from and tweaks

X) Other (please describe after [Answer]: tag below)

[Answer]: In-browser editable table with the ability for the instrctor to pick from a predefined templates.

---

## Question 4: Data Persistence
What needs to be saved between sessions?

A) Nothing — fully ephemeral, state lives only in the browser

B) Instructor activity configurations only (so they can be reused/shared)

C) Instructor configurations AND student submission results/scores

D) Everything including detailed per-student attempt history and reflection responses

X) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Question 5: Scoring and Reflection Logic
The prototype scores placements against "weighted matches" and shows a reflection prompt for the weakest match. How should this behave?

A) Keep it exactly as the prototype: weighted alignment score + one canned reflection prompt for the weakest match

B) Weighted score + reflection, but instructors can customize the reflection prompts per activity/phase

C) Add richer feedback (per-card correctness, partial credit explanations) beyond the prototype

X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 6: Expected Scale
What usage scale should we design for?

A) Small — a single instructor / classroom (tens of concurrent users)

B) Medium — a department or school (hundreds of concurrent users)

C) Large — institution-wide or multi-institution (thousands+ concurrent users)

D) Unknown / start small but allow growth

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 7: Technology / Hosting Preference on AWS
Do you have a preference for how it's built and hosted on AWS?

A) Serverless-first (e.g., S3/CloudFront for frontend, API Gateway + Lambda, DynamoDB) — cost-efficient, scales to zero

B) Containers (e.g., ECS/Fargate) with a managed database (e.g., RDS)

C) No preference — recommend the best fit for the requirements

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 8: Domain Scope
The sample data uses a Real Estate Development process (and you have related docs in this workspace). Is the app domain-specific or general?

A) General-purpose — any instructor can define any activities/phases for any subject

B) Real-estate-development focused, but configurable within that domain

C) Real-estate-development only, fixed content

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question: Resiliency Extensions
Should the resiliency baseline be applied to this project?

**What this extension is.** Enabling it applies a set of **directional, design-time best practices** for building resilient systems, derived from the **AWS Well-Architected Framework (Reliability Pillar)**. It steers requirements, design, and code toward fault tolerance, high availability, observability, and recoverability.

**What this extension is NOT.** It does **not** make your workload production-ready, nor certify any availability/RTO/RPO target. It is a **starting point**, not a substitute for a formal AWS Well-Architected Review.

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C
