# High CPU

Signals: process CPU above 85%, event loop delay rising, latency rising across many routes.

## Confirm

- On the runtime dashboard, is it every instance or one?
  - Every instance, rising with request rate: it's load. Capacity problem.
  - One instance, or rising without more traffic: something inside the process (a hot loop, a huge payload, a stuck job).
- On a host or container:

```sh
top -o %CPU               # which process
top -H -p <pid>           # which threads: main thread, worker pool, or GC
pidstat -u -p <pid> 1     # CPU per second for one process
docker stats              # per container
kubectl top pod           # per pod
```

## Mitigate

- Load-driven: scale out; rate-limit the top clients ([abnormal-traffic.md](abnormal-traffic.md)).
- One instance: take it out of rotation, capture a CPU profile ([node-profiling.md](node-profiling.md)), then restart it.
- Started right after a deploy: roll back.

## Diagnose

- Take a CPU profile of a busy instance and look at the widest frames. Usual suspects: parsing or serializing very large JSON, catastrophic regex backtracking, synchronous crypto or compression, sorting or filtering large arrays in memory, logging inside hot loops.
- A large share of time in garbage collection means a memory problem: [high-memory.md](high-memory.md).
- Traces of slow requests show whether time goes to application code (CPU) or to waiting (database, external calls).

## Fix and follow up

- Move CPU-heavy work off the request path (worker threads or a background job), cap input sizes, paginate, cache results that are expensive and stable.
- Add a benchmark or load test for the hot path, and the dashboard panel or alert that would have caught it sooner.
