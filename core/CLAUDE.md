@AGENTS.md
@standards/principles.md
@standards/stack.md

## Claude Code

- `AGENTS.md` is the source of truth for every agent. Put shared rules there, not here; this file only holds Claude-specific notes.
- When asked to review, hand the review to the `reviewer` subagent (`.claude/agents/reviewer.md`) so the reviewer isn't the author.
