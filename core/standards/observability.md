# Observability and operations

Goal: know a service is unhealthy before users report it, find the cause in minutes, and prove the fix worked. Step-by-step procedures are in `docs/runbooks/`.

## Service levels

- Every user-facing service writes down its SLOs in `docs/runbooks/README.md`: availability (share of requests that don't fail with 5xx) and latency (p95 and p99 of its critical routes), measured over 28 days.
- The error budget is 100% minus the SLO. When it is spent, reliability work comes before features.
- Alerts that wake someone fire on symptoms users feel (the error budget burning fast), not on every cause. Causes (CPU, memory) belong on dashboards and in warning-level alerts.

## Telemetry every service emits

**Logs**

- JSON to stdout, one line per event, through the project logger. The platform ships the logs; the app never writes log files.
- Every line carries service, environment, version, trace id, and request id.
- One access log line per request: method, route template (`/orders/:id`, not the raw URL), status, duration in ms, request and response size, client address, user or tenant id (opaque), user agent.
- Never secrets, tokens, or personal data.

**Metrics** (OpenTelemetry semantic convention names)

| Question                           | Metric                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| Traffic, errors, latency per route | `http.server.request.duration` histogram by `http.route`, method, status           |
| Is the process busy?               | `process.cpu.utilization`                                                          |
| Is memory leaking?                 | `process.memory.usage`, `v8js.memory.heap.used` vs. `v8js.memory.heap.limit`       |
| Is the event loop blocked?         | `nodejs.eventloop.delay.p99`, `nodejs.eventloop.utilization`                       |
| Is garbage collection struggling?  | `v8js.gc.duration`                                                                 |
| Is the connection pool exhausted?  | `db.client.connection.count` (used, idle), `db.client.connection.pending_requests` |
| Are queries slow?                  | `db.client.operation.duration` by operation                                        |
| Is async work stuck?               | outbox pending count, age of the oldest pending event, dead-lettered count         |
| Is the host overloaded?            | `system.cpu.utilization`, `system.memory.utilization`                              |

**Traces**

- OpenTelemetry, with context propagated across HTTP calls and through messages as message metadata.
- A span for every incoming request, database query, external call, and event handler.
- Keep every error trace and every slow trace; sample the rest (about 10%) at the collector.

## Health and shutdown

- `/health/live` says the process is running; it checks no dependencies.
- `/health/ready` says the instance can serve traffic: database reachable, migrations applied. It returns 503 while shutting down.
- On SIGTERM: stop accepting work, finish in-flight requests within a timeout, flush telemetry, exit.

## Limits that stop abnormal load

- Timeouts everywhere: incoming request and header timeouts, database `statement_timeout` and `idle_in_transaction_session_timeout`, timeouts on every outgoing call.
- Bounded pools and queues. Pool size times instance count stays below the database's `max_connections` minus headroom for admins; beyond that, use a connection pooler.
- Rate limits per client (address, user, API key) at the edge and on expensive routes; a maximum request body size; a maximum page size.
- Under overload, reject with 429 or 503 and `Retry-After` instead of queueing without limit.

## Dashboards (one per service)

1. Golden signals: request rate, error rate, p50/p95/p99 latency by route.
2. Runtime: CPU, memory (RSS, heap used vs. limit), event loop delay and utilization, GC time.
3. Database: pool used/idle/pending, query p95 by operation, slow query count, connections vs. maximum.
4. Async work: outbox pending, oldest pending age, dead letters.
5. Traffic: top clients by request rate, 4xx and 5xx by client, top routes by count and latency.

## Alerts (starting thresholds; tune them with real data)

| Alert                   | Condition                                                          | Level   |
| ----------------------- | ------------------------------------------------------------------ | ------- |
| Error budget, fast burn | burning 14× faster than allowed over 1 hour (confirmed over 5 min) | page    |
| Error budget, slow burn | burning 6× faster than allowed over 6 hours                        | ticket  |
| Latency                 | p95 above the SLO target for 15 minutes                            | page    |
| Event loop blocked      | delay p99 above 100 ms for 5 minutes                               | warning |
| CPU saturated           | process CPU above 85% for 10 minutes                               | warning |
| Memory                  | heap above 85% of its limit for 10 minutes, or rising for an hour  | warning |
| Pool exhausted          | pending connection requests above 0 for 5 minutes                  | page    |
| Database connections    | above 80% of `max_connections`                                     | warning |
| Outbox lag              | oldest pending event older than 5 minutes                          | warning |
| Dead letters            | any new dead-lettered event                                        | ticket  |

Every alert links to its runbook. An alert nobody acts on is deleted, not ignored.

## Profiling and performance testing

- Reproduce locally or in staging first. In production, profile one instance taken out of rotation, or use a low-overhead continuous profiler.
- Load test before launch and before changing a hot path: find the throughput where p95 leaves the SLO, and run a 30-minute soak to check memory stays flat.
- Runtime-specific steps: `docs/runbooks/node-profiling.md`.

## Incidents

- Declare early. One person leads; status updates go out every 30 minutes.
- Mitigate first (roll back, scale out, block an abusive client, turn off a feature flag), then diagnose.
- Every user-visible incident gets a blameless postmortem within five working days (`docs/runbooks/postmortem-template.md`). Each action item becomes an issue with an owner.
