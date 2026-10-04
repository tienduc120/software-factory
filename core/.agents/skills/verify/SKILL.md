---
name: verify
description: Run the project's gate and fix what fails without weakening any check. Use before committing, before opening a PR, and when CI fails.
---

# Verify

1. Run the gate command from `standards/stack.md` (`pnpm verify` in the TypeScript stack).
2. When it fails, read the first error and fix its cause in the code or the test.
   - Never edit lint, compiler, test, or coverage config, `eslint-rules/`, `standards/`, CI workflows, or agent config to get green. Never add suppression comments.
   - Coverage below the gate means behavior without a test. Add a test that fails if that behavior breaks, never a test that only raises the number.
   - A test that passes and fails without code changes is flaky. Report it; don't rerun until it passes.
3. Run the gate again until it passes. Keep the command and the last lines of its output as evidence.
4. For a failing CI run: `gh pr checks <number>` to find it, `gh run view <run-id> --log-failed` to read it, then reproduce it locally before changing code.
