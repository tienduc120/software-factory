# Testing

Every behavior has a test, and every test can fail. A test that passes no matter what the code does is worse than no test: it costs maintenance and gives false confidence.

## What to test

- Every behavior change comes with a test that fails before the change and passes after it.
- Bug fix: first write the test that reproduces the bug and watch it fail, then fix.
- Test through the public interface (exported functions, HTTP endpoints, components as users see them), not private helpers.
- Assert on outputs and observable effects, not on which internal function was called.
- Domain and application code must keep 90% line and branch coverage (enforced by `test:coverage` in the gate). Elsewhere coverage is a signal, not a target.

## What not to test

- Thin wrappers with no logic of their own: a provider that only exposes `useState`, a hook that only forwards to a query library, a container that only wires parts together, re-export `index.ts` files, type-only files, style-only files. Their behavior is covered by the tests of whatever uses them.
- The framework or library itself (that `useState` updates state, that the ORM saves a row).
- A copy of the implementation: if the test recomputes the expected value with the same logic as the code, it proves nothing. Use concrete literal expectations.
- Snapshots of whole outputs. They break on every change and say nothing about which part matters.

Ask: "If this code broke, would this test notice?" If not, delete or rewrite the test.

## Tests that always pass (forbidden)

| Smell                                                                                       | Fix                                                                   |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| No assertion, or only "doesn't throw"                                                       | Assert the actual result (lint: `vitest/expect-expect`).              |
| Assertion inside `if`/`catch`/a loop that may not run                                       | Make the path deterministic; assert unconditionally (lint-enforced).  |
| `toEqual`, `toMatchObject`, `objectContaining`, `toHaveLength`, `toBeDefined`, `toBeTruthy` | `toStrictEqual` on the whole value (lint-enforced).                   |
| Range assertions (`toBeGreaterThanOrEqual(1)`) or "either A or B"                           | Assert the exact value; if it isn't fixed, fix the code or the setup. |
| Mocking the unit under test, or asserting a mock returned what it was told to               | Mock only boundaries; assert the unit's own output.                   |
| Only the "applied" side of a condition                                                      | Test both sides: `true` and `false`, present and absent.              |
| `.skip`, `.only`, commented-out tests                                                       | Fix or delete with an issue link (lint-enforced).                     |

## Required tests by layer

| Code                                                            | Test                                                      | Mocks                       |
| --------------------------------------------------------------- | --------------------------------------------------------- | --------------------------- |
| entities, value objects                                         | unit test of every method and rule                        | none                        |
| domain services                                                 | unit test                                                 | allowed for repositories    |
| repositories, query services                                    | against a real database (container), check the end state  | none for the database       |
| API endpoints                                                   | full stack: controller → use case → repository → database | only auth and external APIs |
| use cases                                                       | optional when API tests cover them                        | fakes for ports             |
| pure functions, validation, mapping between API and view models | unit test with normal, boundary, and invalid inputs       | none                        |

- API tests never mock use cases, repositories, or domain services: that defeats their purpose, which is proving the parts work together.
- Reproduce error cases with real requests: an invalid body for 400, an unauthorized actor for 403, a missing id for 404, a rejecting external API mock for upstream failures. Don't force errors by mocking internals.
- When a use case gains a new call or branch, its API test gains a case for it.
- Write tests check the stored end state, not only the response.

## Writing a test

- Structure: arrange, act, assert, separated by a blank line.
- One behavior per test. A test name with "and", "or", or "/" is two tests.
- Name states the condition and the expected result: `rejects an expired coupon`, `returns undefined when the id is unknown`.
- Boundary values: empty, zero, one, exactly the limit, one past the limit.
- Compare the whole object with `toStrictEqual`: response bodies, database rows, return values. Adding a field then forces the test to be updated.
- Generated values use matchers: `expect.any(String)` for ids, `expect.any(Date)` for timestamps. An empty result is `toStrictEqual([])`.
- Use `toStrictEqual` for every comparison where possible, including mock calls: `expect(send.mock.calls).toStrictEqual([[order]])` checks the call count and every argument at once; `toStrictEqual([])` proves something was never called. `toHaveBeenCalled*` matchers are lint-blocked.
- Shared fixtures live next to the tests in a `<name>.fixture.ts` file.

## Rules

- Deterministic: no real network, no real clock, no unseeded randomness. Inject time and id generators.
- Independent: tests pass in any order and in parallel. Each test creates its own data.
- Mock only what you don't own (third-party APIs, the clock). For your own modules, prefer simple fakes over mocks.
- Never commit `.only` or `.skip`.
- A flaky test is a bug. Fix it, or delete it and open an issue. Never retry until green.

## Kinds of tests

- **Unit**: pure logic, no I/O, runs in milliseconds. Most tests are unit tests.
- **Integration**: a real database or queue in a container, or the HTTP layer exercised in-process. For boundaries and wiring.
- **End-to-end**: a handful of critical user journeys only. A manual or agent-run E2E report lists every case with its result, a screenshot per case, and the cases that couldn't be reproduced, with the reason.
