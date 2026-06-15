# U2 Authoring — Domain Entities

Technology-agnostic domain model for activity/phase configurations. The weighting model here is the
contract consumed by U3 Scoring.

## Fixed Phase Catalog (Q2=C)
Phases are **system-fixed** for the real-estate-development domain and are NOT editable by instructors:
1. `PLANNING` (order 1)
2. `CONSTRUCTION` (order 2)
3. `OPERATIONS` (order 3)

> This refines US-2.2: instructors edit **activities and weighted mappings**, not phases.

## Entity: Activity
| Field | Type | Notes |
|---|---|---|
| activityId | Id | unique within a configuration |
| title | string | e.g., "Site Feasibility Review" |
| description | string | short explanation shown on the card |

## Entity: WeightedMapping (Q1=B)
Expresses how strongly an activity aligns to a phase. One mapping per (activity, phase) that has a weight.
| Field | Type | Notes |
|---|---|---|
| activityId | Id | |
| phase | Phase | from fixed catalog |
| weight | int (0–100) | alignment strength; highest weight = primary/correct phase |

- An activity may have weights in **multiple phases** (supports multi-phase placement, US-3.2).
- The phase with the highest weight is the activity's **primary** phase; others are partial.

## Entity: ReflectionPrompt (Q4=A)
Custom feedback defined per activity–phase relationship.
| Field | Type | Notes |
|---|---|---|
| activityId | Id | |
| phase | Phase | |
| explanation | string | partial-credit explanation for placing the activity in this phase |
| reflectionPrompt | string | shown if this relationship is the student's weakest match |

## Entity: Configuration
| Field | Type | Notes |
|---|---|---|
| configId | Id | |
| ownerInstructorId | Id | owner (U1) |
| name | string | |
| activities | List<Activity> | |
| mappings | List<WeightedMapping> | |
| prompts | List<ReflectionPrompt> | |
| status | enum | Draft, Saved |
| createdAt / updatedAt | timestamp | |

## Entity: ConfigurationVersion (Q5=A)
A frozen snapshot of a Configuration used to generate an Exercise; preserves history.
| Field | Type | Notes |
|---|---|---|
| versionId | Id | |
| configId | Id | parent configuration |
| versionNumber | int | increments on each apply |
| snapshot | Configuration data | immutable copy (activities, mappings, prompts) |
| createdAt | timestamp | |

> The generated Exercise instance (owned by U3) references a `versionId`. Past attempts stay tied to
> the version they were taken on (NFR-4.2).

## Entity: Template
A reusable starting configuration: system-seeded (curated real-estate-development) or instructor-saved.
| Field | Type | Notes |
|---|---|---|
| templateId | Id | |
| source | enum | SYSTEM_SEEDED, INSTRUCTOR_SAVED |
| ownerInstructorId | Id? | null for system-seeded |
| name | string | |
| snapshot | Configuration data | activities, mappings, prompts (phases are the fixed catalog) |

## Relationships
- Instructor(1) — (0..n) Configuration; Instructor(1) — (0..n) Template(INSTRUCTOR_SAVED)
- Configuration(1) — (0..n) ConfigurationVersion
- Configuration(1) — (1..n) Activity; Activity(1) — (1..n) WeightedMapping (across fixed phases)
- Activity(1) — (0..n) ReflectionPrompt (per phase)
