# Slow requests

## Confirm

- Compare p95 and p99 latency by route.
  - Every route slow: a shared cause (CPU, blocked event loop, exhausted connection pool, a slow common dependency).
  - One route slow: its own code or query.
- Open traces of the slowest requests and find the widest span.

## Where the time goes

| Widest span                        | Next step                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| A database query                   | [database.md](database.md), "Slowest queries" and "Analyze one query"                           |
| Waiting for a database connection  | Pool exhausted: [database.md](database.md), "Connections"                                       |
| An external API                    | Check its status; confirm timeouts, retries with backoff and jitter, and a circuit breaker      |
| No span, time in our code          | CPU or a blocked event loop: [high-cpu.md](high-cpu.md), [node-profiling.md](node-profiling.md) |
| Before the request reaches the app | Load balancer queueing or too few instances: scale out                                          |

## Fix and follow up

- N+1 queries (many identical small queries per request): batch them or join.
- Missing index, unbounded result sets: add the index, paginate.
- Slow work that the user doesn't need to wait for: move it to a background job.
- Add the slow route to the load test so a regression is caught before release.
