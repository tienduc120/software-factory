# Profiling a Node.js process

## Runtime health at a glance

`src/platform/observability/telemetry.ts` exports runtime and host metrics when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (the starter's `pnpm start` loads it with `--import`). The metrics that matter most:

| Metric                                              | Reading                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `nodejs.eventloop.delay.p99`                        | Above 100 ms: something blocks the loop, so every request waits. |
| `nodejs.eventloop.utilization`                      | Near 1: the loop is saturated; scale out or move work off it.    |
| `v8js.memory.heap.used` vs `v8js.memory.heap.limit` | Climbing baseline: a leak ([high-memory.md](high-memory.md)).    |
| `v8js.gc.duration`                                  | Rising: memory pressure.                                         |
| `process.cpu.utilization`                           | Compare with request rate ([high-cpu.md](high-cpu.md)).          |

To see them locally, run an all-in-one OpenTelemetry backend with Grafana (pin the image tag in real use):

```sh
docker run --rm -p 3001:3000 -p 4317:4317 -p 4318:4318 grafana/otel-lgtm
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 OTEL_SERVICE_NAME=my-service pnpm start
# Grafana: http://localhost:3001
```

## CPU profile

Whole run, written when the process exits:

```sh
pnpm build
node --cpu-prof --cpu-prof-dir=.profiles dist/main.js
```

Running server, on demand:

1. Start it with `--inspect=127.0.0.1:9229`. Never bind the inspector to a public address: it allows running arbitrary code. On Linux and macOS you can enable it on a live process with `kill -USR1 <pid>` and reach it through an SSH tunnel.
2. Open `chrome://inspect`, attach, and record a profile for about 30 seconds while the problem is happening.
3. Read the result in Chrome DevTools or at speedscope.app (it opens `.cpuprofile` files). Sort by self time; the widest frames are where the CPU goes.

## Heap and leaks

- Start the process with `--heapsnapshot-signal=SIGUSR2`, then `kill -USR2 <pid>` writes a `.heapsnapshot` file to the working directory. Taking a snapshot pauses the process and needs roughly the heap's size in extra memory, so take it on an instance out of rotation.
- Take snapshot A, apply load for a few minutes, take B, load again, take C. In DevTools' Memory tab, compare B with C: object types whose count only grows are the leak, and "Retainers" shows what holds them.
- Allocation sampling for a whole run: `node --heap-prof dist/main.js` writes a `.heapprofile` on exit.

## Event loop blocking

- Record a CPU profile while event loop delay is high; long synchronous frames on the main thread are the blockers.
- `node --trace-sync-io` prints a stack trace for every synchronous I/O call made after startup.

## Crashes and stuck processes

- `--report-on-fatalerror --report-uncaught-exception --report-directory=<dir>` writes a diagnostic report (JavaScript and native stacks, heap statistics, open handles such as sockets and timers) when the process dies.
- Too many open sockets or timers in that report points to leaked connections or intervals.

## In production

- Prefer continuous profiling (Grafana Pyroscope's Node agent or your APM's profiler): low-overhead sampling of CPU and heap that you can compare before and after a deploy.
- Signals (`SIGUSR1`, `SIGUSR2`) don't exist on Windows; there, use `--inspect` and DevTools.
- Profiles and snapshots can contain request data; `.gitignore` already excludes `.profiles/`, `*.cpuprofile`, `*.heapprofile`, and `*.heapsnapshot`. Never attach them to public issues.
