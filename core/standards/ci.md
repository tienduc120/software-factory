# CI and agents in CI

## Required checks

`main` accepts changes only through a pull request that passes three checks:

| Check       | Workflow        | What it proves                                                             |
| ----------- | --------------- | -------------------------------------------------------------------------- |
| `ci-passed` | `ci.yml`        | The gate from `standards/stack.md` passes, and agent skills are in sync    |
| `pr-title`  | `pr-title.yml`  | The title, which becomes the squash commit, is a Conventional Commit       |
| `ai-review` | `ai-review.yml` | An independent reviewer found no blocker from `standards/review-rubric.md` |

- `ci-passed` gathers every CI job, so adding or renaming a job never needs a ruleset change.
- A skipped check counts as passed. Drafts and Dependabot pull requests skip `ai-review` on purpose; nothing else should skip a required check.
- When `ai-review` can't run (agents paused, a fork, no token), it fails. A maintainer then reviews and merges with the ruleset bypass, which GitHub records.
- The ruleset and repository settings come from the factory's `setup-github` script, not from clicks in the settings page.

## Writing workflows

- Every workflow and job sets `permissions:` to the minimum it needs. The workflow default is `{}` or `contents: read`.
- Every job sets `timeout-minutes`.
- Third-party actions are pinned to a full commit SHA with the version in a comment. Dependabot keeps the pins current.
- `actions/checkout` uses `persist-credentials: false` unless a later step must push.
- Untrusted text (PR titles, bodies, comments, branch names) reaches scripts only through `env:`, never as `${{ }}` inside `run:`.
- Never use `pull_request_target` with a checkout of the pull request's code.
- A job triggered by `workflow_run` works on the exact commit that ran (`workflow_run.head_sha`) and stops if the branch has moved on.
- No `paths:` filters on workflows that produce required checks: a check that never starts blocks the pull request forever. Filter inside the job instead.
- Concurrency groups cancel superseded runs for the same pull request, except runs that may be pushing.

## Agents in CI

| Trigger                                          | Workflow        | Result                                                         |
| ------------------------------------------------ | --------------- | -------------------------------------------------------------- |
| Label an issue `agent`                           | `claude.yml`    | Claude implements it on `agent/<issue>-…` and opens a draft PR |
| Mention `@claude` in an issue or PR comment      | `claude.yml`    | Claude answers or pushes the requested change                  |
| A ready PR is opened or updated                  | `ai-review.yml` | Review comments and a PASS or FAIL verdict                     |
| `ci` or `ai-review` fails on an `agent/*` branch | `babysit.yml`   | Claude fixes the cause and pushes, up to three times           |

- Only accounts with write access can trigger an agent, and comment triggers are filtered to owners, members, and collaborators before a job starts.
- Agents can't push to `main` (ruleset) or merge (no tool for it). A human merges.
- **Kill switch:** set the repository variable `AGENTS_PAUSED` to `true` (`gh variable set AGENTS_PAUSED --body true`). Every agent workflow stops; `ai-review` fails closed.
- **Budgets:** each agent run has a turn limit and a job timeout; reviews skip drafts; babysit stops after three attempts per PR and labels it `needs-human`. Remove the `babysit-N` labels to give it more attempts.
- Agents authenticate with the `CLAUDE_CODE_OAUTH_TOKEN` secret and push through the Claude GitHub App, so their pushes trigger CI. A push made with the default `GITHUB_TOKEN` would not.
- Agent tool permissions list exact commands. A wildcard such as `Bash(git push:*)` lets crafted flags run arbitrary code on the runner.
