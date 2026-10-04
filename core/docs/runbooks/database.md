# Database (PostgreSQL)

Run these with a read-only role. During an incident, a second person confirms before anyone cancels sessions or runs DDL or `DELETE`.

## Connections

```sql
-- Connections by client and state
SELECT datname, usename, application_name, client_addr, state, count(*) AS connections
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY connections DESC;

SHOW max_connections;
```

Sessions `idle in transaction` hold a connection and their locks. The application opened a transaction and is doing something slow inside it (often an external call, which `standards/architecture.md` forbids) or never committed.

```sql
SELECT pid, usename, application_name, client_addr,
       now() - xact_start AS transaction_age, left(query, 120) AS last_query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND now() - xact_start > interval '1 minute'
ORDER BY transaction_age DESC;
```

Guard rails: set `idle_in_transaction_session_timeout` and `statement_timeout` for the application role. Keep pool size times instance count below `max_connections` minus admin headroom; beyond that, put a connection pooler (PgBouncer) in front.

## Long-running and blocked queries

```sql
-- What is running right now, longest first
SELECT pid, now() - query_start AS runtime, state, wait_event_type, wait_event,
       left(query, 160) AS query
FROM pg_stat_activity
WHERE state <> 'idle' AND backend_type = 'client backend'
ORDER BY runtime DESC
LIMIT 20;

-- Who is blocking whom
SELECT blocked.pid AS blocked_pid, left(blocked.query, 80) AS blocked_query,
       blocking.pid AS blocking_pid, left(blocking.query, 80) AS blocking_query,
       now() - blocking.xact_start AS blocking_transaction_age
FROM pg_stat_activity AS blocked
JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS blocker(pid) ON true
JOIN pg_stat_activity AS blocking ON blocking.pid = blocker.pid;
```

Cancel the query first: `SELECT pg_cancel_backend(<pid>);`. Terminate the session only if cancelling doesn't work: `SELECT pg_terminate_backend(<pid>);`. Record both in the incident timeline.

## Slowest queries overall

Needs the `pg_stat_statements` extension.

```sql
SELECT calls,
       round(total_exec_time) AS total_ms,
       round(mean_exec_time::numeric, 1) AS mean_ms,
       rows,
       round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 1) AS cache_hit_pct,
       left(query, 160) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

- Order by `total_exec_time` for overall load, `mean_exec_time` for individually slow queries, `calls` for chatty code (N+1).
- After a fix, `SELECT pg_stat_statements_reset();` and measure again.

## Analyze one query

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

`ANALYZE` really runs the query: use a replica, or wrap writes in `BEGIN; ... ROLLBACK;`. Look for sequential scans on large tables, estimated rows far from actual rows (stale statistics: run `ANALYZE <table>`), nested loops over many rows, and sorts spilling to disk.

## Table and index health

```sql
-- Tables read mostly by sequential scan: a missing index?
SELECT relname, seq_scan, idx_scan, n_live_tup
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_scan * n_live_tup DESC
LIMIT 20;

-- Indexes never used: they slow writes and help nothing
SELECT relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Dead rows and vacuum lag
SELECT relname, n_dead_tup, n_live_tup, last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;

-- Cache hit ratio; below 99% for an OLTP workload means memory or query problems
SELECT round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) AS cache_hit_pct
FROM pg_stat_database;
```

## Server resources

- High database CPU with many active queries: find the top queries above.
- High I/O wait: queries reading many blocks (missing indexes) or a working set larger than memory.
- Turn on `log_min_duration_statement` (for example 500 ms), `auto_explain` for plans of slow queries, and `log_lock_waits = on`, so the next incident has evidence in the logs.
