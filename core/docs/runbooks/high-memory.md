# High memory and leaks

Signals: RSS or heap rising steadily, GC time rising, restarts after out-of-memory kills (exit code 137, `OOMKilled`).

## Confirm

- A sawtooth that keeps returning to the same baseline is normal. A baseline that climbs for hours under steady traffic is a leak.
- Heap growing: JavaScript objects are being retained. RSS growing while the heap stays flat: buffers or native memory (large payloads held in memory, streams never consumed).

## Mitigate

- A rolling restart buys time.
- Set a container memory limit, and cap the V8 heap below it (`--max-old-space-size` at about 75% of the limit), so the process fails predictably instead of the kernel killing it at random.

## Diagnose

- Take two or three heap snapshots a few minutes apart under load and compare them ([node-profiling.md](node-profiling.md)). Object types whose count only grows are the leak; their retainers lead to the code holding them.
- Usual causes:
  - in-memory caches or maps with no size limit or expiry;
  - event listeners added per request and never removed;
  - timers and intervals never cleared;
  - closures that keep request or response objects alive;
  - module-level arrays used as queues;
  - large responses buffered in memory instead of streamed.

## Fix and follow up

- Give every cache a size limit and an expiry, remove listeners, clear timers, stream large payloads.
- Add a 30-minute soak test that checks memory returns to its baseline.
