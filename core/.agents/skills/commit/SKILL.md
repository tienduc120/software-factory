---
name: commit
description: Commit the current change as a Conventional Commit that passes the git hooks. Use when asked to commit, or when another skill says to commit.
---

# Commit

1. Look at what changed: `git status` and `git diff`. Stage only the files that belong to this change, by path (`git add <paths>`). Never stage `.env` files, secrets, logs, or build output.
2. Write the message as `standards/git.md` describes: `<type>(<scope>): <summary>`, imperative, lower case, at most 72 characters, saying why when the what is obvious. Add a body after a blank line when the background matters.
3. Run `git commit -m "<summary>"` (add `-m "<body>"` for a body).
4. Never pass `--no-verify` or `-n`, and never set `HUSKY=0`, `LEFTHOOK=0`, or `core.hooksPath`. The guard blocks them anyway.
5. If a hook fails, fix the cause it reports (format, lint, the message) and commit again. Don't amend commits that are already pushed; add a new commit.
6. Don't push unless the task says to. Never push to `main`.
