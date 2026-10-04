# software-factory

A versioned kit that installs one set of coding standards, agent instructions, and quality gates into every TypeScript/Node project. Code is held to the same bar whether a human or any AI agent wrote it.

## Status

| Phase                   | Contents                                                                                                      | Status |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| 1. Standards            | standards, AGENTS.md, TypeScript toolchain, git hooks, DDD/Clean Architecture + starter, PR and ADR templates | done   |
| 2. Gates                | CI, branch rulesets, CODEOWNERS, `setup-github` script                                                        | next   |
| 3. Agents (local)       | skills and subagents (implement, review, verify), agent guard hooks                                           |        |
| 4. Agents (cloud)       | issue → PR, AI review as a required check, babysit, kill switch, budgets                                      |        |
| 5. Auto-merge, optional | tiered auto-merge for low-risk PRs                                                                            |        |
| 6. Improvement loop     | reflect on review corrections, sync factory updates into projects                                             |        |

## Use

```sh
node scripts/install.mjs ../my-service              # new or existing project
node scripts/install.mjs ../my-service --hooks husky
cd ../my-service && pnpm install && pnpm verify
```

Existing files are kept (use `--force` to overwrite). `package.json`, `.gitignore`, and `.gitattributes` are always merged, and the project's dependency versions win. The starter code is added only when the project has no `src/`.

## Repository layout

The repo holds two different things: the **payload** copied into projects, and the **factory's own tooling**. They live apart so one can never leak into the other.

| Folder                         | Role                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `core/`                        | Payload for every project, whatever the language: `AGENTS.md`, `CLAUDE.md`, `standards/`, PR and ADR templates, runbooks, editor and git config                          |
| `stacks/<stack>/`              | Payload for one language: toolchain config, lint rules, `standards/stack.md`, `standards/react.md`, runtime runbooks                                                     |
| `stacks/<stack>/hooks/<name>/` | One payload per git hook runner (Lefthook or Husky); exactly one is installed                                                                                            |
| `stacks/<stack>/starter/`      | Reference code for new projects only: two bounded contexts (`ordering`, `billing`) talking through contracts, an outbox, an anti-corruption layer, logging and telemetry |
| `scripts/`                     | The factory's tooling: `install.mjs` (CLI), `lib/installer.mjs`, `smoke.mjs`                                                                                             |
| `test/`                        | Installer tests                                                                                                                                                          |
| `docs/`                        | Documentation about the factory itself                                                                                                                                   |

Root files (`README.md`, `package.json`, `.gitignore`) belong to the factory. If the payload sat at the root too, the factory's `package.json` and README would collide with the ones meant for projects, the installer would need an exclude list that grows with every new file, and the factory's own future CI in `.github/` would be copied into every project.

## Develop the factory

```sh
pnpm test     # installer unit tests
pnpm smoke    # installs into temp projects and proves every gate fires, for both hook runners (needs network)
pnpm format
```

## Design rules

- If a tool can check a rule, a tool checks it. Prose is only for what tools can't check.
- Agents never edit the rules that judge them.
- The author of a change never approves it.
- Evidence over claims: every PR shows its change working.
- `AGENTS.md` is the single source of truth for every agent. See [docs/agents.md](docs/agents.md).

How this differs from pstack and other well-known stacks: [docs/comparison.md](docs/comparison.md). Every rule and what enforces it: [docs/rule-coverage.md](docs/rule-coverage.md). Rules scheduled for later phases: [docs/roadmap.md](docs/roadmap.md).

## License

[MIT](LICENSE): free to use, copy, modify, and distribute, including commercially. Keep the copyright notice.

## References and credits

This repo adapts ideas from the work below. No code was copied from it; the wording and implementation here are original.

**Agent workflows and software factories**

- [pstack](https://github.com/cursor/plugins/tree/main/pstack) by Lauren Tan: one-rule principles, playbooks, the author never approving their own merge, evidence before merge, a stop order for every agent.
- [superpowers](https://github.com/obra/superpowers) by Jesse Vincent: plan before code, test first, a fresh context per task.
- [gstack](https://github.com/garrytan/gstack) by Garry Tan: separate roles for implementing, reviewing, testing, and shipping.
- [everything-claude-code](https://github.com/affaan-m/everything-claude-code) by affaan-m: hooks that block mistakes as they happen.
- [Warp: software factory](https://docs.warp.dev/platform/software-factory/): the inner (execution) and outer (improvement) loops.
- [claude-code-action](https://github.com/anthropics/claude-code-action) by Anthropic: running Claude in GitHub Actions.

**Agent instruction formats**

- [AGENTS.md](https://agents.md): one instruction file for every coding agent.
- [Agent Skills specification](https://agentskills.io/specification): the portable skill format.
- [Kiro steering](https://kiro.dev/docs/steering/): how Kiro loads `AGENTS.md` and steering files.

**Architecture**

- _Domain-Driven Design_ by Eric Evans: bounded contexts, aggregates, ubiquitous language.
- _Implementing Domain-Driven Design_ by Vaughn Vernon: context mapping, aggregate design, domain events.
- [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) by Robert C. Martin: dependencies pointing inward.
- [Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html) and [idempotent consumer](https://microservices.io/patterns/communication-style/idempotent-consumer.html) patterns by Chris Richardson.

**Engineering practice**

- [Conventional Commits](https://www.conventionalcommits.org): commit and PR title format.
- [Architecture decision records](https://adr.github.io) and MADR: the ADR template and Y-statements (Olaf Zimmermann).
- [EARS](https://alistairmavin.com/ears/) by Alistair Mavin: the requirement sentence patterns used in specs.
- [Testing Library query priority](https://testing-library.com/docs/queries/about/#priority): role-first queries.
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) from the React docs: the alternatives to `useEffect`.

**Operations**

- [Google SRE books](https://sre.google/books/): SLOs, error budgets, multi-window burn-rate alerts, blameless postmortems.
- [The USE method](https://www.brendangregg.com/usemethod.html) by Brendan Gregg, and the RED method by Tom Wilkie: what to measure for resources and for requests.
- [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/): metric and attribute names.
- [PostgreSQL statistics views](https://www.postgresql.org/docs/current/monitoring-stats.html) and [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html): the database runbook queries.
- [Node.js command-line options](https://nodejs.org/api/cli.html): profiling, heap snapshots, and diagnostic reports.

**Tools the stack is built on**

- [TypeScript](https://www.typescriptlang.org), [typescript-eslint](https://typescript-eslint.io), [ESLint](https://eslint.org), [Prettier](https://prettier.io), [Vitest](https://vitest.dev) and its [ESLint plugin](https://github.com/vitest-dev/eslint-plugin-vitest).
- [Inversify](https://inversify.io), [pino](https://getpino.io), [OpenTelemetry JS](https://opentelemetry.io/docs/languages/js/).
- [Lefthook](https://github.com/evilmartians/lefthook), [Husky](https://typicode.github.io/husky/), [lint-staged](https://github.com/lint-staged/lint-staged), [commitlint](https://commitlint.js.org).
