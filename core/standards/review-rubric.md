# Review rubric

Used by human reviewers and by the AI reviewer. The reviewer is never the author. Review the diff against the issue, not against the author's explanation of it.

## Verdict

- **FAIL** if there is at least one blocker.
- **PASS** otherwise. Majors and minors are reported but don't block.

## Blockers (must fix)

1. The change doesn't do what the issue asks, or an acceptance criterion has no evidence.
2. Correctness bug: wrong logic, unhandled error path, race condition, broken edge case (empty, null, very large, concurrent, unicode, time zones).
3. Security issue as defined in `standards/security.md`, including authorization checked only at the route and not in the use case.
4. Behavior changed without a test that would fail without the change. A test that can't fail (see the "always pass" table in `standards/testing.md`) counts as no test.
5. A gate was weakened: CI, lint, compiler config, `standards/`, agent config folders, deleted or skipped tests, suppression comments without a justification.
6. Unrelated changes mixed into the PR.
7. Breaking change to an API path, database schema, config, or environment variable without a migration path in the PR description.
8. Architecture violation from `standards/architecture.md`: a business rule in a use case or controller instead of the entity, a repository returning non-domain data, a use case calling another use case, an external call inside a database transaction, a delete that bypasses the entity's event.
9. A swallowed error, an external failure treated as success, or an error response that exposes internals.
10. A database rule from `standards/database.md` broken: `SELECT *`, `UPDATE`/`DELETE` without `WHERE`, SQL built from strings, a hand-made schema change.

## Majors (should fix)

- Ignores an existing pattern or `standards/conventions.md`; re-implements something that already exists.
- Hard to follow: names that aren't verb + noun or don't say what differs, deep nesting, logic that needs a comment to explain what it does.
- Public members that could be private; mutable state that could be read-only.
- Tests that check implementation details, test a thin wrapper or the library itself, assert partially where a whole-object `toStrictEqual` was possible, or mock internal layers in API tests.
- Hard-coded paths, URLs, or limits that belong in constants or config.
- Missing user-facing error handling in UI code (see `standards/react.md` when present).

## Minors (nits)

- Small simplifications and wording that tools don't catch. Prefix with `nit:`.

## Writing findings

- Base every finding on the diff and cite the rule it breaks (`standards/<file>.md`, section). No finding from guesswork.
- Each finding has: severity, `file:line`, what's wrong, a concrete failure scenario (this input or state gives this wrong result), and a suggested fix.
- No concrete scenario means no finding. When you can't be sure, ask a question instead of asserting.
- Don't repeat a finding already raised on the PR.
- Comment on unchanged lines only when the change makes them a regression risk.
- Don't report what linters, the formatter, or the compiler already enforce.

## Report format

```md
**Verdict: PASS | FAIL**

| #   | Severity | Location       | Problem | Failure scenario | Suggested fix | Rule |
| --- | -------- | -------------- | ------- | ---------------- | ------------- | ---- |
| 1   | blocker  | src/file.ts:42 | ...     | ...              | ...           | ...  |
```
