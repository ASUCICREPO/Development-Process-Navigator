# Functional Design Plan — U2 Authoring

**Unit**: U2 Authoring (templates, configuration editing, save, apply)
**Stories**: US-2.1 (start from template), US-2.2 (edit configuration table), US-2.3 (customize
reflection prompts/explanations), US-2.4 (save for reuse), US-2.5 (apply to generate exercise)
**Scope**: Technology-agnostic business logic, domain entities, and rules for authoring activity/
phase configurations. The **weighting scheme defined here directly feeds U3 Scoring**.

## Execution Checklist (Part 2 will execute these)
- [x] Generate `business-logic-model.md` — template/config workflows, edit, save, apply
- [x] Generate `business-rules.md` — validation and configuration constraints
- [x] Generate `domain-entities.md` — Configuration, Phase, Activity, WeightedMapping, ReflectionPrompt, Template
- [x] Validate coverage of US-2.1..US-2.5 and alignment with U3 scoring needs

---

## Clarifying Questions

## Question 1: Activity → Phase Weighting Scheme
How should an activity's alignment to phases be expressed? (This drives scoring.)

A) Single correct phase per activity (binary: right/wrong)

B) Weighted across phases — each activity has weights per phase (e.g., 0–100), allowing primary/secondary correctness and partial credit

C) Ranked phases per activity (1st choice, 2nd choice, ...)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 2: Phases — Fixed or Configurable
How are phases defined?

A) Instructor defines phases freely per configuration (name + order)

B) Phases come from the chosen template but can be renamed/reordered

C) Fixed real-estate-development phases (e.g., Planning, Construction, Operations) — not editable

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 3: Configuration Validation Rules
What must be true before a configuration can be applied to students?

A) Every activity must map to at least one phase with a weight; at least one phase and one activity exist

B) Minimal — allow applying even if some activities are unmapped (unmapped = no correct placement)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: Reflection Prompts / Explanations Granularity
At what level are custom reflection prompts and partial-credit explanations defined? (US-2.3)

A) Per activity–phase relationship (most specific feedback)

B) Per activity (one prompt/explanation per activity, regardless of phase)

C) Per phase (one prompt per phase)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5: Re-applying / Versioning a Configuration
When an instructor edits and re-applies a configuration that students already used (US-2.5):

A) Create a new exercise version; past attempts remain tied to the version they were taken on (preserves history per NFR-4.2)

B) Update in place; clear current placements only; past attempts keep their stored snapshot

X) Other (please describe after [Answer]: tag below)

[Answer]: A
