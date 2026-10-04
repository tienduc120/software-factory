# Agent support

`AGENTS.md` holds every shared rule. Each tool gets the smallest possible adapter.

| Agent                                 | Reads natively                | What the factory adds                                                           |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| Claude Code                           | `CLAUDE.md` (not `AGENTS.md`) | `CLAUDE.md` that imports `@AGENTS.md` and auto-loads principles and stack rules |
| OpenAI Codex                          | `AGENTS.md`                   | nothing                                                                         |
| Cursor                                | `AGENTS.md`                   | nothing                                                                         |
| GitHub Copilot (VS Code, cloud agent) | `AGENTS.md`                   | `.vscode/` settings and recommended extensions for humans                       |
| Devin                                 | `AGENTS.md`                   | nothing                                                                         |
| Google Jules                          | `AGENTS.md`                   | nothing                                                                         |
| JetBrains Junie                       | `AGENTS.md`                   | nothing                                                                         |
| Kiro                                  | `AGENTS.md` at the root       | nothing; add `.kiro/steering/` only for Kiro-specific, file-scoped rules        |

## Why not symlinks

- On Windows, creating a symlink needs Developer Mode or admin rights, and git checks symlinks out as plain text files unless `core.symlinks=true`. A clone on another machine silently gets a one-line file containing a path.
- Some tools ignore symlinked instruction files (Kiro loads only real files from `.kiro/steering/`).
- A symlink makes two tools read identical text. An import (`@AGENTS.md` in `CLAUDE.md`) shares the rules and still allows tool-specific notes.

## Rules for tool-specific files

- Shared rules live only in `AGENTS.md` and `standards/`.
- A tool's own file contains an import or pointer plus notes that truly apply to that tool alone.
- When a tool needs a real copy, the installer writes it from one source and CI fails if the copies drift. Skills are the one case today: `.agents/skills/` is the source (Codex and the Agent Skills format), and the installer copies it to `.claude/skills/` for Claude Code. The project's `ci.yml` runs `diff -r` on the two.

## Skills and subagents

| Skill        | Does                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| `ship-issue` | issue → acceptance criteria → path by size → test first → verify → draft PR  |
| `commit`     | stages only the change, writes a Conventional Commit, never skips hooks      |
| `open-pr`    | self-review against the rubric, push the branch, fill the template, draft PR |
| `review-pr`  | reviews in a fresh context against the rubric; prints, never posts           |
| `verify`     | runs the gate and fixes causes, never the checks                             |

Skill files use only the portable frontmatter (`name`, `description`) so every tool can read them. Claude Code also gets a `reviewer` subagent (`.claude/agents/reviewer.md`) so a review always runs in a fresh context.

## Guards

`.agents/guards/guard.mjs` blocks what hooks and CI can't stop on their own: skipping hooks (`--no-verify`, `-n`, `HUSKY=0`, `LEFTHOOK=0`, `core.hooksPath`), pushing to `main`, merging pull requests, posting PR or issue comments from a local session, and destructive SQL (`DROP`, `TRUNCATE`, `ALTER TABLE`, `SELECT *`, `UPDATE`/`DELETE` without `WHERE`) sent through a database client.

| Where                          | How it runs                                                             | Covers                                      |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------- |
| Claude Code                    | `PreToolUse` hook on `Bash` and `PowerShell` in `.claude/settings.json` | every rule above                            |
| git, for every agent and human | the `pre-push` hook (Lefthook or Husky)                                 | pushes to `main` (unless hooks are skipped) |
| GitHub                         | the `protect-main` ruleset                                              | pushes to `main`, merges without checks     |

Codex, Cursor, and other tools get the git and GitHub layers today. Their own command hooks are on the roadmap, reusing the same `findCommandViolation` function.

`.claude/settings.json` also allows the gate and read-only commands (`pnpm verify`, `git diff`, `gh pr view`, …) without a prompt, so agents don't stall waiting for approval.

## Cloud agents

The cloud workflows use `anthropics/claude-code-action` with the `CLAUDE_CODE_OAUTH_TOKEN` secret, so they run on the owner's Claude subscription. `standards/ci.md` describes the triggers, the kill switch, and the budgets.

## Git hooks

- Lefthook by default; Husky + lint-staged when the project already uses Husky or `--hooks husky` is passed.
- Both run the same checks: format and lint staged files on commit, commitlint on the message, the push guard and `pnpm verify` before push.
- Hooks are a convenience. Anyone, human or agent, can skip them with `--no-verify`; CI runs the same gate and the ruleset requires it, so CI is the real enforcement.
