# Stack: TypeScript / Node

## Toolchain

- Node 24 LTS (`.nvmrc`), pnpm (pinned in `package.json#packageManager`), ESM only.
- TypeScript strict with legacy decorators (for DI), ESLint with typescript-eslint strict type-checked rules, Prettier, Vitest, tsx for local runs.
- Dependency injection: Inversify with decorators.

## Commands

| Command         | Purpose                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`  | Install dependencies and git hooks.                                                                                       |
| `pnpm verify`   | **The gate.** Format check, lint, typecheck, tests with coverage, build. Must pass before a PR. CI runs the same command. |
| `pnpm test`     | Run tests once. `pnpm test:watch` to watch; `pnpm test:coverage` adds the coverage gate.                                  |
| `pnpm lint:fix` | Auto-fix lint issues.                                                                                                     |
| `pnpm format`   | Format all files.                                                                                                         |
| `pnpm dev`      | Run `src/main.ts` with restart on change.                                                                                 |

## TypeScript rules

- TypeScript only; no `.js` files in `src/`.
- `const` unless the variable is reassigned. No `var`.
- No `any`. Use `unknown` and narrow it, or write the precise type.
- No `as` casts and no non-null `!`. Narrow with checks or parse with a schema. `as const` is fine. Only `src/shared/kernel` may cast, to create brands.
- Use `type`, not `interface`.
- No `enum`. Use an `as const` object plus a derived union type.
- Named exports only. Default exports only in config files that require them.
- Use `import type` for type-only imports.
- Relative imports include the `.ts` extension: `import { Order } from './order.ts'`.
- Every promise is awaited, returned, or explicitly marked with `void`.
- `switch` on a union handles every case.
- Data is `readonly` by default. Don't mutate function arguments. Class members are `private` unless used outside the class, and `private readonly` unless reassigned.
- `undefined`, not `null`, inside the app. No spreading class instances (`{ ...order }`): it drops methods and the brand.
- Names: functions and methods verb + noun in strictCamelCase (`parseJson`, not `parseJSON`); types and classes StrictPascalCase nouns; boolean variables start with `is`, `has`, `can`, `should`, `was`, or `will`; module constants may be `UPPER_CASE`.
- Tests: Vitest, imported explicitly. Use `assert(result.ok)` to narrow a Result in a test; never wrap an `expect` in `if`.
- Validate external data with zod at the boundary and derive the type from the schema.

## Domain building blocks

The starter module `src/modules/ordering` shows every pattern below working together. Copy its shape.

**Result** (`src/shared/kernel/result.ts`): expected failures are returned, not thrown.

```ts
const quantity = Quantity.parse(input.quantity);
if (!quantity.ok) return quantity;
```

**Brands** (`src/shared/kernel/brand.ts`): every value object and entity is nominal.

```ts
export type OrderId = Brand<string, 'OrderId'>;
export const OrderId = {
  generate: (): OrderId => brand(crypto.randomUUID(), 'OrderId'),
  parse: (raw: string): Result<OrderId, InvalidOrderId> =>
    /* validate, then */ ok(brand(raw, 'OrderId')),
} as const;
```

**Fixed sets of values**:

```ts
export const OrderStatus = { Placed: 'placed', Cancelled: 'cancelled' } as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
```

**Entities**: a class with a brand, a private constructor of `readonly` value-object properties, static `create`-style factories that return an event, `restore` for rehydration, and methods that return `Result<Event, Error>`.

**Errors**: discriminated unions with a `type` field (`{ type: 'OrderNotFound'; orderId }`), never `Error` subclasses for expected failures.

**Dependency injection**:

- `@injectable()` on use cases, domain services, repositories, and adapters.
- Every constructor parameter has an explicit `@inject(Token)`. Interfaces don't exist at runtime, and explicit tokens keep DI working in every tool (tsc, tsx, Vitest) without emitted metadata.
- A port's token shares its type's name: `export type OrderRepository = {...}` and `export const OrderRepository = Symbol('OrderRepository')`.
- Bindings live in `<context>-module.ts`. Only the composition root (`src/main.ts`) touches the container.
- Unit tests construct classes directly with fakes; they don't need the container.

## What the gate enforces

Everything above that a tool can check is checked by `pnpm verify`; `pnpm smoke` in the factory repo proves each rule fires.

- Architecture (`eslint-rules/architecture.mjs`): layer and module boundaries; entity shape (private constructor, `readonly` value-object properties, static `restore`); use cases and services expose only `execute`.
- Domain and application: no `try`/`catch`, no `throw`, no `null`, no framework, database, or Node built-in imports.
- Everywhere: no `any`, `as`, `!`, `enum`, default exports, plain `Error` throws, `console`, `var`, needless `let`, spreads of class instances, `.js` in `src/`; naming conventions; `private` members `readonly` when never reassigned; `finally` never returns.
- Tests: every test asserts; no `expect` inside conditions; `toStrictEqual` for every comparison, including `mock.calls` (loose and partial matchers are blocked); no `.only` or `.skip`.
- Coverage: 90% of lines, branches, functions, and statements in `domain/` and `application/`.
