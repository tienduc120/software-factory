# Git and pull requests

## Branches

- Trunk-based: `main` is the only long-lived branch. It is protected; nobody pushes to it directly, and everything lands through a PR.
- Branch names: `<type>/<issue>-<short-slug>`, e.g. `feat/42-invoice-export`. Agent branches use `agent/<issue>-<short-slug>`. Urgent production fixes use `hotfix/<issue>-<short-slug>`.
- Releases are tags on `main`: `release/YYYYMMDD` (append `-2`, `-3` for further releases the same day), with release notes on the tag.

## Commits

- Conventional Commits: `<type>(<optional scope>): <summary>`.
- Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
- Scope is the module or top-level area changed (`ordering`, `db`, `ci`); several scopes are comma-separated.
- Summary: imperative, lower case, no trailing period, at most 72 characters, and says why when the what is obvious. Example: `fix(billing): round totals before tax so invoices match receipts`.
- A body, after a blank line, explains background the summary can't.
- Breaking change: `feat!: ...` plus a `BREAKING CHANGE:` footer that says how to migrate.
- Enforced by commitlint in the `commit-msg` hook and by the PR title check in CI.
- Never bypass hooks with `--no-verify`. If a hook is wrong, fix the hook in its own PR.

## Pull requests

- One purpose per PR. Aim for under 400 changed lines, not counting lockfiles and generated files. Split bigger work into a sequence of PRs that each leave `main` working.
- The title is the squash-commit message, so it follows Conventional Commits, under 70 characters.
- The body follows `.github/pull_request_template.md`: Why, What changed, Design (a Mermaid diagram), Not in this PR, Evidence, Review focus, Risk and rollback, Decisions, References.
- The description lists every change, including any that look like rebase or cleanup noise, and what changed since the previous review round.
- Merge method is squash only, so `main` has linear history.
- When behind `main`, rebase. Don't merge `main` into the branch.
- Force-push only to your own branch, and only with `--force-with-lease`.
- Open as draft while work is in progress. Mark ready only when the definition of done in AGENTS.md is met.
