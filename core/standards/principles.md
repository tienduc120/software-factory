# Principles

One rule each. Cite them by name in plans, PRs, and reviews.

1. **Prove it works.** Done means shown working: a test that fails without the change, command output, or a screenshot. "Should work" is not evidence.
2. **Fix root causes.** Find out why it broke before changing code. No symptom patches, no retry-until-green, no silenced checks.
3. **Subtract before adding.** Try deleting or simplifying first. The best change is the smallest one that meets the acceptance criteria.
4. **One change, one purpose.** No drive-by refactors or "while I'm here" edits. Unrelated improvements become their own issue.
5. **Follow the existing pattern.** Before inventing, find how this codebase already solves it and do the same. Consistency beats local cleverness.
6. **Make wrong states unrepresentable.** Let types model the domain so invalid data can't be constructed.
7. **Validate at the edge, trust inside.** Parse external input once at the boundary into typed values; inner code doesn't re-check.
8. **Fail loudly.** Never swallow errors. A visible failure is cheaper than silent corruption.
9. **Test behavior, not implementation.** Tests assert what callers observe, so refactors don't break them.
10. **Don't move the goalposts.** Never weaken a gate (CI, lint, types, tests, standards) to make a change pass. Argue for the rule change in its own PR.
11. **Never block on a human.** When unsure, take the safest reversible option, write the decision down in the PR, and keep going.
12. **Encode lessons in structure.** When a mistake repeats, add a lint rule, test, type, or standard, not a reminder.
