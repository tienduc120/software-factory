# Workflow

## Pick the path by size

| Change                                                                                  | Path                                             |
| --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Small: a bug fix, a copy change, a one-file refactor                                    | Issue with acceptance criteria → test first → PR |
| Feature, or anything touching several modules, the schema, or a public API              | Spec first (below) → approval → one PR per task  |
| A decision that is hard to reverse: new dependency, data model, infrastructure, pattern | ADR (below) before the code                      |

When unsure, take the bigger path.

## Spec first

Specs live in `docs/specs/<feature>/`. An agent may draft every file; a human approves each one before the next starts.

1. `requirements.md`: background, goal, out of scope, and acceptance criteria in EARS form:
   - `WHEN <event> THE SYSTEM SHALL <response>`
   - `IF <condition> THEN THE SYSTEM SHALL <response>`
   - `WHILE <state> THE SYSTEM SHALL <response>`

   Include non-functional requirements: performance, security, limits.

2. `design.md`: the short document a reviewer reads. Affected modules and aggregates, entities and events, API and data model changes, a sequence diagram of the main flow, alternatives considered and why they lost, risks. Implementation detail (SQL, code sketches, research notes) goes in `research.md` so the design stays reviewable.
3. `tasks.md`: numbered tasks, each small enough for one PR, each with its own verification, dependencies stated.

Then implement task by task, test first. When implementation changes the plan, update the spec in the same PR.

## Architecture decision records

- File: `docs/adr/NNNN-<slug>.md` (four-digit number, kebab-case slug), copied from `docs/adr/0000-template.md`.
- One ADR, one decision. If the problem doesn't fit in one sentence, it isn't ready.
- Options get short ids (`(a)`, `(b)`) so other sections can refer to them.
- The decision is one sentence in Y-statement form: "In the context of <use case>, facing <concern>, we decided for <option> and against <other options>, to achieve <quality>, accepting <downside>."
- Consequences list the good, the bad, and the neutral, and say how compliance is checked (test, lint rule, CI).
- Status moves proposed → accepted → deprecated or superseded. An accepted ADR is never rewritten; a changed decision is a new ADR that supersedes it.
