# U2 Authoring — Business Logic Model

Technology-agnostic workflows. All actions are instructor-only (authorized via U1).

## W1: List Templates (US-2.1)
1. Input: instructor token.
2. Return system-seeded templates + the instructor's own saved templates.

## W2: Create Configuration from Template (US-2.1)
1. Input: templateId (optional).
2. If provided, copy the template snapshot (activities, weighted mappings, prompts) into a new Draft Configuration owned by the instructor. Phases come from the fixed catalog.
3. If no template, start an empty Draft (phases still fixed).
4. Output: configId.

## W3: Edit Configuration (US-2.2, refined)
1. Instructor adds/edits/removes **activities** (title, description).
2. Instructor sets **weighted mappings** per activity across the fixed phases (weight 0–100).
3. Phases themselves are fixed and not editable (Q2=C).
4. Changes update the Draft in place.

## W4: Customize Reflection Prompts & Explanations (US-2.3)
1. Instructor defines, per activity–phase relationship, an explanation and a reflection prompt (Q4=A).
2. Stored as ReflectionPrompt records on the configuration.

## W5: Validate Configuration (Q3=A)
1. Check: at least one phase (always true — fixed) and at least one activity.
2. Check: every activity has at least one WeightedMapping with weight > 0.
3. Return validation result (errors itemized).

## W6: Save Configuration (US-2.4)
1. Validate (W5) for save-as-usable, or allow saving Draft.
2. Persist configuration (status=Saved) for reuse/editing.

## W7: Save As Template (US-2.4)
1. Input: configId, name.
2. Create a Template(source=INSTRUCTOR_SAVED) from the configuration snapshot, owned by the instructor.

## W8: Apply Configuration → Exercise Version (US-2.5, Q5=A)
1. Precondition: configuration passes validation (W5).
2. Create a new ConfigurationVersion (increment versionNumber) as an immutable snapshot.
3. Generate/refresh the student Exercise instance referencing this versionId (Exercise owned by U3).
4. Current placements/results for the active exercise instance are cleared; past attempts remain tied to their original version (NFR-4.2).
5. Output: exerciseId + versionId.

## Error / Edge Scenarios
- Apply attempted on an invalid configuration → blocked with validation errors (W5).
- Activity with no mapping → validation error (Q3=A).
- Editing a configuration after apply → does not change prior versions; a new version is created on next apply.
- Non-owner instructor accessing a configuration → denied (U1 ownership scoping).
