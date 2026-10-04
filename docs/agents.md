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
- When a tool needs a real copy (for example skills, which Claude Code reads from `.claude/skills/` and Codex from `.agents/skills/`), the factory generates the copy and CI fails if it drifts. That arrives with the agent skills in phase 3.

## Git hooks

- Lefthook by default; Husky + lint-staged when the project already uses Husky or `--hooks husky` is passed.
- Both run the same checks: format and lint staged files on commit, commitlint on the message, `pnpm verify` before push.
- Hooks are a convenience. Anyone, human or agent, can skip them with `--no-verify`; CI runs the same gate and is the real enforcement (phase 2).
