# U2 Authoring — Business Rules

## Phase Rules (Q2=C)
- BR-2.1: Phases are system-fixed for the real-estate-development domain: PLANNING, CONSTRUCTION, OPERATIONS (in that order). Instructors cannot add, rename, reorder, or remove phases.
- BR-2.2: This refines US-2.2 — instructors configure activities and weighted mappings only.

## Weighting Rules (Q1=B)
- BR-3.1: Each activity defines a `weight` (integer 0–100) per phase via WeightedMapping; phases without a mapping are treated as weight 0.
- BR-3.2: An activity may carry positive weights in multiple phases (supports multi-phase placement, US-3.2).
- BR-3.3: The phase with the highest weight is the activity's **primary** (most correct) phase; lower-weight phases are partially correct. (Exact scoring math is defined in U3.)
- BR-3.4: At least one phase must have weight > 0 for every activity (see validation).

## Validation Rules (Q3=A)
- BR-4.1: A configuration may be applied only if: at least one activity exists AND every activity has at least one WeightedMapping with weight > 0.
- BR-4.2: Draft configurations may be saved without passing full validation, but cannot be applied until valid.

## Reflection / Explanation Rules (Q4=A)
- BR-5.1: Reflection prompts and partial-credit explanations are defined per activity–phase relationship.
- BR-5.2: If a relationship has no custom prompt/explanation, the system falls back to a generic default (defined in U3 feedback).

## Versioning Rules (Q5=A)
- BR-6.1: Applying a configuration creates a new immutable ConfigurationVersion (incrementing versionNumber).
- BR-6.2: Generated exercises reference a specific versionId; past attempts remain tied to the version they were taken on (NFR-4.1/4.2).
- BR-6.3: Editing a saved configuration never mutates existing versions.

## Ownership Rules
- BR-7.1: All authoring actions are instructor-only and scoped to the owning instructor (enforced via U1 authorization).
- BR-7.2: System-seeded templates are readable by all instructors; instructor-saved templates are private to their owner.

## Story Coverage
- US-2.1 → W1, W2 (templates)
- US-2.2 → W3 (refined: activities + weights; phases fixed)
- US-2.3 → W4, BR-5.x
- US-2.4 → W6, W7
- US-2.5 → W8, BR-6.x
