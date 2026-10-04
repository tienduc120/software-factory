# Runbooks

Every alert links to one of these. Each follows the same order: confirm, mitigate, diagnose, fix, follow up. The standard behind them is `standards/observability.md`.

## Service levels

<!-- Fill in per service: availability target (e.g. 99.9% of requests without 5xx over 28 days), latency targets for critical routes (e.g. p95 < 300 ms), owner, escalation contact. -->

## First five minutes, for any alert

1. **Is it real and user-facing?** Open the golden-signals dashboard: error rate, latency, traffic, and when the change started.
2. **What changed?** Deploys, config, migrations, feature flags, new traffic sources in the last hour. If a deploy lines up, roll back first and investigate after.
3. **How wide?** One instance or all? One route, tenant, or client, or everything?
4. **Mitigate before diagnosing:** roll back, scale out, block or rate-limit an abusive client, turn off the feature flag.
5. **Keep a timeline** (UTC timestamps, what you saw, what you did) for the postmortem.

## Index

| Symptom                                                 | Runbook                                          |
| ------------------------------------------------------- | ------------------------------------------------ |
| CPU high, everything slow                               | [high-cpu.md](high-cpu.md)                       |
| Memory rising, restarts, out-of-memory kills            | [high-memory.md](high-memory.md)                 |
| Some or all requests slow                               | [slow-requests.md](slow-requests.md)             |
| Database slow, connections exhausted, locks             | [database.md](database.md)                       |
| Traffic spike, suspicious clients, too many connections | [abnormal-traffic.md](abnormal-traffic.md)       |
| Profiling a process (CPU, heap, event loop)             | [node-profiling.md](node-profiling.md)           |
| After the incident                                      | [postmortem-template.md](postmortem-template.md) |
