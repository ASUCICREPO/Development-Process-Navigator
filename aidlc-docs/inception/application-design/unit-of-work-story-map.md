# Units of Work — Story Map

Maps all 16 user stories to the units that implement them. Frontend units (U0A/U0B) deliver the UI;
backend units (U1–U5) deliver the logic/persistence. Most stories span a frontend and a backend unit.

## Mapping

| Story | Description | Primary Backend Unit | Frontend Unit |
|---|---|---|---|
| US-1.1 | Register an account | U1 Identity & Access | U0A + U0B (register screens) |
| US-1.2 | Log in & land in role view | U1 | U0A + U0B |
| US-1.3 | Role-based access protection | U1 | U0A + U0B |
| US-2.1 | Start from a template | U2 Authoring | U0A Instructor UI |
| US-2.2 | Edit configuration table | U2 | U0A |
| US-2.3 | Customize reflection prompts/explanations | U2 | U0A |
| US-2.4 | Save a configuration for reuse | U2 | U0A |
| US-2.5 | Apply configuration to generate exercise | U2 (→ U3) | U0A |
| US-3.1 | View the exercise | U3 Exercise & Scoring | U0B Student UI |
| US-3.2 | Place activities (incl. multiple phases) | U3 | U0B |
| US-3.3 | Submit a complete sort | U3 (→ U4) | U0B |
| US-3.4 | Correct incorrect placements & resubmit once | U3 (→ U4) | U0B |
| US-3.5 | Receive score & feedback | U3 Scoring (→ U4) | U0B |
| US-3.6 | Reflect on weakest match | U3 + U4 | U0B |
| US-4.1 | View my attempt history | U4 Results & History | U0B |
| US-4.2 | Instructor views class results | U4 | U0A |
| US-5.1 | Start a live session | U5 Live Session | U0A |
| US-5.2 | Students join & complete live exercise | U5 (→ U3, U4) | U0B |
| US-5.3 | Instructor views live progress | U5 (real-time) | U0A |

## Coverage by Unit
- **U1 Identity & Access**: US-1.1, US-1.2, US-1.3
- **U2 Authoring**: US-2.1, US-2.2, US-2.3, US-2.4, US-2.5
- **U3 Exercise & Scoring**: US-3.1, US-3.2, US-3.3, US-3.4, US-3.5, US-3.6 (scoring)
- **U4 Results & History**: US-3.5, US-3.6, US-4.1, US-4.2, US-5.2 (recording)
- **U5 Live Session**: US-5.1, US-5.2, US-5.3
- **U0A Instructor UI**: US-1.x (login), US-2.x, US-4.2, US-5.1, US-5.3
- **U0B Student UI**: US-1.x (login), US-3.x, US-4.1, US-5.2

## Validation
- ✔ All 16 stories assigned to at least one backend and one frontend unit.
- ✔ All FRs (FR-1..FR-6) covered (via the application-design coverage matrices).
- ✔ No story left unmapped; no unit without stories.
