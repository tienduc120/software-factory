# Rule coverage

Every rule from the imported rule set and the owner's own list, where it now lives, and what enforces it. **lint**, **types**, and **coverage** fail `pnpm verify`; `pnpm smoke` proves each lint rule fires. **review** means the review rubric checks it. **phase N** means it arrives with that phase ([roadmap](roadmap.md)).

## Code

| Rule                                                                                          | Where                     | Enforced by                                    |
| --------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------- |
| `const` instead of `let`, no `var`                                                            | conventions, stack        | lint                                           |
| No non-null assertion `!`                                                                     | conventions, stack        | lint                                           |
| `undefined` instead of `null`                                                                 | conventions               | lint (domain, application) + review            |
| TypeScript, not JavaScript                                                                    | conventions, stack        | lint                                           |
| `private`/`readonly` unless needed otherwise                                                  | conventions, stack        | lint (`prefer-readonly`) + review              |
| Names: verb + noun functions, noun types, boolean prefixes, acronyms as words, units in names | conventions               | lint (format, booleans) + review (verb + noun) |
| No abbreviations, internal jargon, or time-relative names                                     | conventions               | review                                         |
| `type` + `as const` instead of `enum`                                                         | stack                     | lint                                           |
| Brands for every value object and entity                                                      | stack, architecture       | types                                          |
| Result pattern; no catch outside boundaries                                                   | conventions, architecture | lint (domain, application)                     |
| No `return` in `finally`                                                                      | conventions               | lint                                           |
| No plain `Error`; named error classes                                                         | conventions               | lint                                           |
| No spreading class instances                                                                  | stack                     | lint                                           |
| DI with decorators, explicit tokens                                                           | stack, starter            | smoke (tsc, tsx, Vitest)                       |
| No obvious comments; no URLs in comments                                                      | conventions               | review                                         |
| Constants for paths, URLs, limits; reuse before adding                                        | conventions               | review                                         |
| Env vars in every environment; test env in one place; no real values in CI                    | conventions               | review, phase 2                                |
| No `console`; structured logger                                                               | conventions               | lint                                           |

## Architecture

| Rule                                                                                                                                                     | Where                                              | Enforced by             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------- |
| Layers point inward; other modules only through their `contracts/`, and only from infrastructure or the module file                                      | architecture                                       | lint                    |
| No I/O libraries in domain or application                                                                                                                | architecture                                       | lint                    |
| Entity: private constructor, `readonly` value-object properties, `restore`                                                                               | architecture                                       | lint                    |
| Own id per aggregate, even with composite keys                                                                                                           | architecture                                       | review                  |
| State changes via entity methods returning events; create and delete emit events                                                                         | architecture                                       | types + review          |
| Repository writes accept events; delete goes through the entity                                                                                          | architecture                                       | types                   |
| No event arrays; one list event for bulk                                                                                                                 | architecture                                       | review                  |
| First-class collections only when they hold rules                                                                                                        | architecture                                       | review                  |
| Business decisions on the entity, not in the use case                                                                                                    | architecture                                       | review                  |
| Use case / service: one public `execute`                                                                                                                 | architecture                                       | lint                    |
| Use cases don't call use cases; shared steps in a domain service; no `shared.ts`                                                                         | architecture                                       | review                  |
| Repository naming (`find`/`get`/`exists`, `create`/`update`/`delete`), returns entities; query service for joins and pagination; storage is a repository | architecture                                       | review                  |
| One transaction per use case; external calls outside; ordering and compensation; idempotent retries with backoff                                         | architecture                                       | review                  |
| Authorization in the use case, not only the route                                                                                                        | architecture, security                             | review                  |
| Error-to-status mapping; fixed 500 message; no internals in errors; fail closed                                                                          | architecture                                       | review                  |
| Route path constants; aggregate-named resources; no jargon in public paths; backward-compatible changes                                                  | architecture                                       | review                  |
| Tenant isolation by default; crossing tenants named explicitly                                                                                           | architecture, database                             | review                  |
| Bounded contexts per subdomain; context map; relationship patterns                                                                                       | architecture, context map                          | review (ADR to change)  |
| Integration events: versioned, plain data, mapped from domain events in infrastructure                                                                   | architecture, starter                              | types + review          |
| Outbox, inbox, at-least-once delivery, retries with backoff, dead letters                                                                                | architecture, starter (platform/messaging)         | tests                   |
| Anti-corruption layer for every consumer                                                                                                                 | architecture, starter (billing/infrastructure/acl) | lint + review           |
| No shared tables, entities, or grab-bag shared code between contexts                                                                                     | architecture                                       | lint (imports) + review |
| Platform is technical only; shared kernel tiny and domain-neutral                                                                                        | architecture                                       | lint                    |

## Database

| Rule                                                                     | Where    | Enforced by                        |
| ------------------------------------------------------------------------ | -------- | ---------------------------------- |
| Audit columns `_timestamp`, business dates `_at`                         | database | review                             |
| No `SELECT *`; `WHERE` on every `UPDATE`/`DELETE`                        | database | review, phase 3 (agent guard hook) |
| Aliases on multi-table queries; `tenant_id` filter first; escaped `LIKE` | database | review                             |
| Query names `create`/`get`/`list`/`update`/`delete`                      | database | review                             |
| Migrations only, backward compatible                                     | database | review                             |

## Tests

| Rule                                                                                          | Where          | Enforced by                                                                   |
| --------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| Unit tests required for business logic                                                        | testing        | coverage (90% domain, application)                                            |
| Only meaningful tests; no tests of wrappers or libraries                                      | testing, react | review                                                                        |
| No always-pass tests: every test asserts, no conditional assertions                           | testing        | lint                                                                          |
| `toStrictEqual` for every comparison, including mock calls; `expect.any` for generated values | testing        | lint (`prefer-strict-equal`, `no-restricted-matchers`, no `objectContaining`) |
| Required tests per layer; API tests mock only auth and external APIs                          | testing        | review                                                                        |
| One behavior per test; both sides of a condition; exact assertions; exact mock call counts    | testing        | review                                                                        |
| Arrange, act, assert; names state condition and result                                        | testing        | review                                                                        |
| No `.only`/`.skip`; no snapshots                                                              | testing, react | lint (`.only`/`.skip`) + review                                               |
| E2E report format                                                                             | testing        | review                                                                        |

## Frontend (React)

| Rule                                                                        | Where | Enforced by                       |
| --------------------------------------------------------------------------- | ----- | --------------------------------- |
| Avoid `useEffect`                                                           | react | review; lint with the React stack |
| File and name patterns for components, hooks, contexts, types, styles; BEM  | react | review                            |
| Data hooks per endpoint with query key factories; no business logic in them | react | review                            |
| User-visible error handling; expected errors handled in place               | react | review                            |
| Component, hook, and context test rules; role-based queries; no snapshots   | react | review                            |
| Root-cause UI fixes; check the design first; three widths                   | react | review                            |

## Operations

| Rule                                                                           | Where                              | Enforced by                       |
| ------------------------------------------------------------------------------ | ---------------------------------- | --------------------------------- |
| SLOs, error budgets, symptom-based alerts                                      | observability, runbooks            | review, phase 4 (alerts as code)  |
| Structured logs with trace and request ids; access log per request             | observability, starter logger      | review                            |
| Runtime and host metrics (CPU, memory, event loop, GC)                         | observability, starter telemetry   | smoke (telemetry starts)          |
| Health endpoints, graceful shutdown, timeouts, bounded pools, rate limits      | observability                      | review, service starter (roadmap) |
| Runbooks for CPU, memory, slow requests, database, abnormal traffic, profiling | docs/runbooks                      | review                            |
| Blameless postmortems with owned action items                                  | observability, postmortem template | review                            |

## Process

| Rule                                                                       | Where                  | Enforced by                                  |
| -------------------------------------------------------------------------- | ---------------------- | -------------------------------------------- |
| Conventional Commits with scope; summary under 72 characters               | git                    | hook (commitlint) + phase 2 (PR title check) |
| Never `--no-verify`; never push to `main`                                  | AGENTS.md, git         | phase 2 (branch rules)                       |
| PR template with design diagram and evidence                               | git, PR template       | template + review                            |
| Trunk-based branches, hotfix branches, release tags                        | git                    | review                                       |
| Spec first for features (EARS requirements, design, tasks, approvals)      | workflow               | review, phase 3 (skill)                      |
| ADRs with options, Y-statement, consequences, status history               | workflow, ADR template | review                                       |
| Review severities (must/want/nits) and finding rules                       | review-rubric          | phase 4 (AI reviewer)                        |
| Agents can't post PR comments from local sessions; destructive SQL blocked | roadmap                | phase 3                                      |

## Not adopted

| Rule                                                                                    | Why                                                                                                      |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Arrow functions only                                                                    | Style preference with no safety benefit; function declarations hoist and name stack traces.              |
| No relative imports (path aliases)                                                      | Path aliases need extra build tooling in Node ESM; the architecture lint rule already guards boundaries. |
| Long-lived per-project `develop` branches                                               | Slow, conflict-prone merges; trunk-based branches suit many small agent PRs.                             |
| Decorator markers on entities and value objects                                         | Brands and the entity-shape lint rule give the same guarantees without decorators.                       |
| `usecase` as one word                                                                   | The rule set contradicted itself; `use-case` / `UseCase` was chosen.                                     |
| Project-specific tooling (task runner wrappers, cloud-vendor queues, design-tool setup) | Not portable; the general rules behind them are kept.                                                    |
