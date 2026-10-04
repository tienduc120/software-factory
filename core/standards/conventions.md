# Conventions

## Naming

- Name things by what they mean in the domain, not by their type or pattern: `invoice`, not `data`, `obj`, or `invoiceManager`.
- Functions and methods are verb + noun: `createInvoice`, `findActiveByEmail`, `sendReminder`. A bare verb (`process`, `handle`, `run`) or bare noun (`invoice()`) doesn't say what happens to what. Exception: a class's single `execute` method, where the class name carries the verb + noun (`PlaceOrderUseCase.execute`).
- Common verbs keep one meaning everywhere: `find` may return nothing, `get` must return something, `create`/`update`/`delete` change state, `parse` turns raw input into a typed value or an error, `to…` converts, `is`/`has`/`can` answer yes or no.
- Booleans read as yes/no questions: `isActive`, `hasAccess`, `canRetry` (lint-enforced for variables).
- Types, classes, and components are nouns: `DraftOrder`, not `Draft`.
- A name alone tells what it does and how it differs from its neighbors: `isLockedAfterFailedLogins`, not `isLocked`; `findActiveByEmail`, not `find2`.
- No abbreviations except widely known ones (`id`, `url`, `db`, `http`). No internal jargon in names that leave the codebase (API paths, error codes, events).
- Acronyms are written as words: `userId`, `apiUrl`, `parseJson`, `HttpClient` (lint-enforced).
- Values with a unit carry it: `timeoutMs`, `ttlSeconds`, `sizeBytes`, `tokenSha256`.
- No time-relative names: `new`, `old`, `legacy`, `v2`, `temp`. They stop being true; name the actual difference.
- File names are kebab-case. One main concept per file.

## Code

- TypeScript, not JavaScript, for all application code (lint-enforced). Tool config files may stay `.mjs` where the tool requires it.
- `const` by default; `let` only when the value is really reassigned (lint-enforced). Prefer `map`, `filter`, early returns, and small functions over accumulating into a variable.
- Members are `private` unless something outside the class uses them, and `readonly` unless they are reassigned (lint-enforced for private members).
- Before adding a helper, constant, or environment variable, search for an existing one. Duplicates drift apart and hide bugs.
- No `console.*` in application code; use the project logger (lint-enforced).

## Structure

- Group by feature (bounded context) first, then by layer. See `standards/architecture.md`.
- Tests live next to the code they test: `invoice.ts` and `invoice.test.ts`.
- Shared code earns its place: extract a helper after the third real duplicate, not before. No catch-all `utils.ts` or `shared.ts`.
- Paths, URLs, and limits are named constants or config, never literals repeated across files.

## Values

- `undefined` means "absent" inside the app. `null` appears only at boundaries that require it (JSON, database rows, external APIs) and is converted at the edge (lint-enforced in domain and application).
- No non-null assertions (`value!`); narrow with a check instead (lint-enforced).
- Delete unused code, unreachable branches, and redundant null checks. Pass values directly instead of through single-use variables.

## Errors

- Never swallow an error. Handle it meaningfully or let it propagate.
- Expected failures (invalid input, not found, conflict) are typed values returned in a Result. Unexpected failures throw.
- Throw named error classes (`class PaymentGatewayError extends Error`), never a plain `Error` (lint-enforced).
- Error messages say what failed and for which id. Never include secrets, personal data, URLs, or internal paths.
- Catch only at the boundary (HTTP handler, job runner, CLI entry point), map to a response or exit code, and log once there.
- A `finally` block never returns or throws; it would silently replace the original outcome (lint-enforced).
- Details of where errors are allowed per layer: `standards/architecture.md`.

## Logging

- Structured logs: a fixed message plus context fields. No string concatenation.
- Levels: `error` needs a human, `warn` is degraded but working, `info` is a business event, `debug` is for development.
- Never log secrets, tokens, passwords, full request bodies, or personal data.

## Configuration

- Config comes from environment variables, validated once at startup. The app refuses to start on invalid config.
- `.env.example` lists every variable with a safe dummy value. Real `.env` files are never committed.
- A new variable is added to every environment's config in the same PR. Environments differ only on purpose, and the reason is written next to the difference.
- Test configuration lives in one shared test env file, not in individual tests. CI config holds dummy values, never real URLs or credentials.
- Never edit a developer's local env file to test something; use a separate env file or process variables.

## Time, money, ids

- Store and send time as UTC ISO-8601. Convert to local time only for display.
- Money is an integer in minor units (cents) plus a currency code. Never floats.
- Ids are opaque strings. Never parse meaning out of them.

## Comments

- Comment the why: a non-obvious reason, constraint, or gotcha. Never the what; the code already shows that.
- Keep comments short. Delete comments that no longer match the code.
- No external URLs in code comments; reference a file path or an ADR instead.
- A `TODO` references an issue: `TODO(#123): ...`.
- Temporary debugging code (extra logging, exposed test hooks) is removed before the PR.
