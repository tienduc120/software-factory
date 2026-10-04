---
name: open-pr
description: Self-review a finished branch, push it, and open a draft pull request that follows the PR template. Use when asked to open, create, or raise a PR.
---

# Open a pull request

1. **Self-review.** Read the whole diff as a reviewer would: `git diff main...HEAD`. Check it against the blockers and majors in `standards/review-rubric.md` and the list below, and fix what you find before going on.
   - Every acceptance criterion has evidence: a test name, command output, or screenshot.
   - Each new test fails without the change.
   - No debug code, commented-out code, or `TODO` without an issue number.
   - No unrelated changes, no gate weakened, no suppression comments.
   - Names say what the thing does (verb + noun for functions).
   - Repeated review comments from past PRs become new lines here.
2. Run the `verify` skill. The gate must pass.
3. Commit anything left with the `commit` skill, then push the branch: `git push -u origin HEAD`. Never push to `main`.
4. Title: a Conventional Commit under 70 characters. It becomes the squash commit on `main`.
5. Body: fill every section of `.github/pull_request_template.md`. Design gets a Mermaid diagram within the template's limits. Evidence lists real output, not "should work". Link the issue with `Closes #<number>`.
6. Open it as a draft: `gh pr create --draft --title "<title>" --body-file <file>`. Write the body file outside the repository.
7. Mark it ready (`gh pr ready`) only when the definition of done in AGENTS.md is met. That starts the AI review.
8. Report the PR link. Never merge it; a human does.
