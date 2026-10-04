---
name: review-pr
description: Review a pull request, branch, or local diff against standards/review-rubric.md and report findings with severities. Use when asked to review code or a PR.
---

# Review a pull request

The reviewer must not be the author. Run this in a fresh context: in Claude Code, hand it to the `reviewer` subagent; in other tools, start a new session.

1. Get the change and its purpose:
   - A PR: `gh pr view <number> --comments` and `gh pr diff <number>`, then the linked issue with `gh issue view`.
   - A local branch: `git diff main...HEAD` and `git log main..HEAD`.
2. Read `standards/review-rubric.md`, then the standards AGENTS.md lists for the areas the diff touches.
3. Judge the diff against the issue, not against the description's claims. Check every blocker in the rubric, then the majors.
4. Keep only findings that cite a rule and have a concrete failure scenario: this input or state gives this wrong result. When unsure, ask a question instead.
5. Skip what lint, the formatter, or the compiler already catch, and anything already raised on the PR.
6. Output the report in the rubric's format: the verdict, then the findings table.
7. Print the report in the session. Local sessions never post comments or reviews on GitHub; the AI review in CI posts its own.
