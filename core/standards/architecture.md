# Architecture: DDD + Clean Architecture

Goal: many business domains in one codebase, each able to change without breaking the others; business rules testable without a database or HTTP; any module extractable into its own service later without a rewrite. Language-specific patterns are in `standards/stack.md`. The starter's `ordering` and `billing` modules show every rule below working together.

## Strategic design: how to split

- **Subdomains** decide where effort goes:
  - **core**: what makes the product different. The richest model, the best tests, built in-house.
  - **supporting**: specific to the business but not a differentiator. Simpler models are fine.
  - **generic**: solved problems (identity, notifications, payments, file storage). Adopt a product or library, wrapped in a thin module.
- **Bounded context**: one model with one language and one owner. It is a module under `src/modules/<context>/`. The same word may mean different things in two contexts ("order" in sales vs. shipping); each context keeps its own model, and no entity or value object is ever shared between contexts.
- **Split by business capability and language**, not by table or entity. Signs a boundary is wrong: two modules always change together, they call each other synchronously in loops, they want the same table, or one needs the other's internal state.
- **Context map**: `docs/architecture/context-map.md` lists every context, its subdomain type, its owner, and how it relates to the others. Changing a relationship is an ADR.

| Relationship                           | Use when                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Open host service + published language | An upstream context serves several consumers: it publishes versioned contracts.                                 |
| Customer / supplier                    | A downstream context's needs drive the upstream's contract; both agree on changes.                              |
| Anti-corruption layer                  | Downstream translates an upstream model (or an external system) into its own terms. Default for every consumer. |
| Conformist                             | Downstream adopts the upstream model as is. Only for generic subdomains you don't control.                      |
| Shared kernel                          | Two contexts co-own a tiny, stable piece of model. Avoid; it couples their release cycles.                      |
| Separate ways                          | Integration costs more than duplication.                                                                        |

## Code layout

```text
src/
  main.ts                       composition root: builds the container, wires modules together
  shared/kernel/                Result, Brand, Clock, integration event base type: tiny, stable, no business meaning
  platform/                     technical capabilities, no business logic
    messaging/                  event bus, outbox, inbox, dispatcher
    observability/              logger, telemetry
    persistence/                database client, transaction runner (when a database is added)
  modules/
    <context>/
      contracts/                the only part other modules may import: integration events and public API types
      domain/                   entities, value objects, domain events, repository ports, domain services
      application/              use cases, query service ports, ports to other contexts and external systems
      infrastructure/
        persistence/            repository and query service implementations
        messaging/              domain event → integration event mapping (outbox)
        acl/                    anti-corruption layer: consumes other contexts' contracts, translates them
      presentation/             HTTP controllers, request schemas, route paths, job and CLI entry points
      <context>-module.ts       DI bindings and event subscriptions for this context
```

- Group by bounded context first, then by layer. A large context may group use cases by feature inside `application/`.
- Keep aggregates small. Splitting a large aggregate later is much harder than merging two small ones.

## Dependency rules

Enforced by lint (`eslint-rules/architecture.mjs`).

| Code in               | May import                                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| `domain/`             | its own `domain/`, `shared/kernel`                                                     |
| `application/`        | its own `domain/`, `application/`, `contracts/`, `shared/kernel`                       |
| `infrastructure/`     | its own module's layers, **other modules' `contracts/`**, `platform/`, `shared/kernel` |
| `presentation/`       | its own `application/`, `presentation/`, `contracts/`, `platform/`, `shared/kernel`    |
| `contracts/`          | its own `contracts/`, `shared/kernel`                                                  |
| `<context>-module.ts` | its own module, other modules' `contracts/`, `platform/`, `shared/kernel`              |
| `platform/`           | `platform/`, `shared/kernel`; never a module                                           |
| `shared/kernel/`      | `shared/kernel` only                                                                   |

- Dependencies point inward. The domain imports no framework, database, HTTP, or I/O library.
- **Only infrastructure (the anti-corruption layer) and the module file touch another context, and only through its `contracts/`.** Domain and application never see another context's types; they see their own ports and value objects.
- Contracts are plain serializable data (strings, numbers, ISO dates), type guards, and constants. Never domain types: exposing them would freeze the domain model.
- Presentation calls use cases. It never touches repositories or entities directly.

## Communication between contexts

- **Default to asynchronous integration events.** Use a synchronous call only when the caller can't proceed without the answer, through a port in the caller's `application/` that its `infrastructure/acl/` implements against the provider's public API.
- **Domain events vs integration events**: domain events are internal, rich, and free to change. Integration events are the public contract: past tense, versioned in their type name (`ordering.order-placed.v1`), carrying ids and the facts consumers need, never whole entities. The context's `infrastructure/messaging/` maps one to the other.
- **Outbox**: integration events are stored in the same transaction as the aggregate change and published after commit. Delivery is at least once.
- **Inbox**: consumers record processed event ids, so a redelivered event is skipped; handlers are idempotent as well. An event that keeps failing goes to a dead-letter state and raises an alert.
- **Anti-corruption layer**: a consumer's `infrastructure/acl/` subscribes to another context's event, validates it, translates it into its own use case input, and calls that use case. The rest of the consumer never knows the other context exists.
- **Versioning**: adding optional fields is compatible. Anything else is a new version, published alongside the old one until every consumer has moved.
- **Workflows across contexts**: a short chain of reactions uses events (choreography). A multi-step workflow with compensation uses a process manager owned by one context, with its state persisted and timeouts handled.
- **Data**: each context owns its tables; no context reads or writes another's. A context that needs another's data keeps its own read model fed by events, or asks through the public API. No distributed transactions: consistency between contexts is eventual, and the user experience says so.

## Shared and similar services

| You have                                                                                           | Put it in                                                                                                             |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A technical capability: database client, event bus, logger, cache, HTTP server, token verification | `platform/`                                                                                                           |
| A tiny, domain-neutral building block: Result, Brand, Clock, the integration event base type       | `shared/kernel/`, changed rarely and only with owner review                                                           |
| A business capability several contexts use: notifications, identity, payments, files               | its own (usually generic) context with contracts; others use it through events or its public API                      |
| Logic that looks similar in two contexts (an address, a discount)                                  | keep a copy in each context; they will diverge. Merge only when it is the same concept with the same rules and owner. |
| Logic shared by use cases inside one context                                                       | a domain service in that context                                                                                      |

Duplication across contexts is cheaper than the wrong shared abstraction. No `shared.ts`, `common/`, or `utils/` grab bag.

## Evolving into services

- Start as a modular monolith: one deployable, many contexts, in-process event bus.
- Because contexts only talk through contracts and the outbox, extracting one into a service means replacing the in-process bus with a broker and the in-process public API with HTTP or gRPC. The domain and application code don't change.
- Extract only for a concrete reason: independent scaling, independent deployment, a separate team, or a different reliability need. Record it in an ADR.

## Entities and aggregates

- An aggregate is the unit of consistency and persistence: load it whole, change it through its root, save it whole.
- Every aggregate has its own id value object, even when the table uses a composite key.
- The constructor is private. `create` builds a new instance (validates and returns a domain event); `restore` rebuilds one from storage (no event).
- Properties are read-only. State changes only through intention-revealing methods (`cancel()`, `rename()`) that return the new state inside a domain event.
- Business decisions (can this order be cancelled? did the email change?) are methods on the entity or value object, not conditions in the use case.
- Properties are value objects, not raw strings or numbers. Booleans are fine.
- Wrap a list in a collection object only when it has rules (uniqueness, size limit) or behavior. Otherwise use a plain read-only array.

## Value objects

- Immutable, compared by value, validated on creation: an invalid value object can't exist.
- Creating one from outside input returns a Result, not an exception.
- Generic value objects (email, URL, UUID) live in the shared kernel with no business rules. Domain-specific ones (customer email) live in their module and may add rules.
- Each value object has its own brand, so a `CustomerId` can't be passed where an `OrderId` is expected.

## Domain events

- Every create, change, and delete returns a domain event (`OrderPlaced`, `OrderCancelled`) that carries the new state. Creation and deletion both emit events; a missing create event is the most common slip.
- Deleting goes through the entity: `order.delete()` returns `OrderDeleted`, and the repository's `delete` accepts that event. Never call a repository delete with a bare id.
- Repository write methods accept the event, not the entity, so code can only persist a change the aggregate actually made.
- One operation returns one event. For bulk operations, define one list event (`OrderLinesImported`) instead of an array of events, so one operation triggers one batch of follow-up work.
- Follow-up work in other modules (emails, sync jobs) reacts to events instead of being called directly from the use case.
- Events are stored in the same transaction as the aggregate (transactional outbox) and dispatched after commit. A queue outage then never fails the user's request, and failed follow-ups can be retried from the stored record.

## Repositories

- Interface in domain, implementation in infrastructure. One repository per aggregate.
- Reads: `findBy…` returns the aggregate or `undefined`. `getBy…` returns the aggregate and treats absence as a bug; use it only when a database constraint guarantees existence. `exists…` for existence checks.
- Writes: `create`, `update`, `delete`, each accepting the matching event type. `createList` for bulk creation.
- Parameters are domain types (ids, events), never raw strings.
- No business logic: only mapping between storage rows and domain objects.
- Always returns domain objects. Before adding a query service, check whether a repository method already answers the question.
- File and object storage is a repository too: it persists and restores domain data. Keep separate classes for database and storage so each stays readable.

## Query services

- For reads that join several aggregates, filter or sort dynamically, or paginate.
- Interface in application, implementation in infrastructure. Returns plain read models, never entities.
- Never used to make a write decision; load the aggregate for that.

## Use cases

- One use case per file, named after the action: `place-order-use-case.ts`, class `PlaceOrderUseCase`, one public method `execute(input)` (plus the acting user when the action needs authorization), types `PlaceOrderInput` and `PlaceOrderOutput`.
- A use case orchestrates: load aggregates, call domain methods, persist events, return output. It holds no business rules.
- Returns a Result: the output, or a typed error union. Expected failures are values, not exceptions.
- Output is plain read-only data, never an entity.
- Use cases never call other use cases. Shared steps go into a domain service.
- Dependencies come in through the constructor by interface token. Never pass the DI container around or resolve from it inside `execute`.
- Authorization is checked inside the use case for the specific resource and actor. A route-level role check is not enough on its own.
- Exactly one public method, `execute`; everything else is private (lint-enforced).

## Services

- Domain services hold domain logic that doesn't belong to one entity: rules across several aggregates, or checks that need a repository (for example "email must be unique").
- Infrastructure services wrap one external capability (send an email, call a payment provider).
- Both are named `<Verb><Noun>Service` with one public method, `execute`; helpers are private (lint-enforced).

## Transactions and side effects

- One transaction per use case. Never nest transactions, and never open a second one in a helper.
- Calls to external systems (HTTP APIs, identity providers, email) happen outside the database transaction: they can't be rolled back, and they hold locks open while they wait.
- Order the steps so a failure leaves a consistent state:
  - Prefer external call first, then the database write. If the call fails, nothing was written.
  - If the database must be written first, register a compensating action that undoes the write when the external call fails.
  - If an external call fails after the database has committed, don't fail the request: log it as an error and let an idempotent retry (job or outbox) converge the state.
- Irreversible calls go last, after everything that can still fail.
- Operations that can be retried are idempotent, so a retry converges instead of duplicating. Retries of external calls use exponential backoff with a maximum attempt count.
- Multi-tenant data: tenant isolation is enforced by the database (row-level security) by default. A method that deliberately crosses tenants says so in its name (`findAllAcrossTenants`).

## Errors

- Expected failures (invalid input, not found, conflict, forbidden, invalid state) are typed error values in a Result.
- Presentation maps each error type to a status with an exhaustive switch: invalid input 400, unauthenticated 401, forbidden 403, not found 404, conflict or invalid state 409.
- Unexpected failures (bugs, infrastructure outages) throw. One global handler logs the details and returns 500 with a fixed, generic message.
- Responses never expose internals: no stack traces, SQL, internal URLs, or hostnames.
- `try/catch` lives only in infrastructure (to turn a library's known failures into Result values) and in the global handler. Never catch and ignore; unknown errors propagate.
- An external service error is never treated as success. Only explicitly expected outcomes (such as "not found") become Result values; everything else fails the operation.
- When a check can't decide (cache down, policy service timeout), fail closed: deny, don't allow.

## Presentation

- Validate body, query, and params with a schema at the edge. Derive the request type from the schema; don't write it twice.
- Route paths are constants defined per module (`order-paths.ts`), never string literals scattered across files. Tests use the same constants.
- The resource name in a path is the aggregate's name (`/orders`), not a feature name. Variants of one aggregate are sub-paths of the same resource.
- Public paths use names an outside reader understands; no internal abbreviations.
- Changing or removing a path is a breaking change: clients deploy separately, so keep the old path working until every client has moved.
- An absence the client expects (for example "does this exist?") is a normal response decided by the controller, not an error.
