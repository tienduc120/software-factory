# Abnormal traffic and connections

Signals: a request-rate spike, a surge of 4xx or 429 responses, many connections from few clients, latency rising with traffic, unusual routes or payload sizes.

## Confirm and identify

From the access logs (the query language depends on your log tool), for the alert window:

- **Top clients by request count**, grouped by client address, user id, API key, and tenant.
- **Their status mix**: many 401 or 403 suggests credential stuffing or a broken client; many 404 suggests scanning; many 429 means limits are already biting.
- **Top routes and request sizes**: sequential ids suggest enumeration; walking pagination to the end suggests scraping; large bodies suggest upload abuse.
- **User agents**: one agent dominating, or none at all.

Connections on a host:

```sh
ss -s                                                     # totals by TCP state
# Established connections to port 3000, counted per remote address
ss -tn state established '( sport = :3000 )' \
  | awk 'NR > 1 { sub(/:[0-9]+$/, "", $4); print $4 }' | sort | uniq -c | sort -rn | head
ss -tn state time-wait | wc -l                            # high churn: clients not reusing connections
```

## Mitigate, least disruptive first

1. Rate-limit or block the offending client at the edge (CDN, WAF, load balancer), not in application code.
2. Tighten the limit on the targeted route; if it was public by mistake, require authentication.
3. If the traffic is legitimate, scale out.
4. Shed load: answer non-critical routes with 503 and `Retry-After`.

## Diagnose and fix

- Legitimate spike (a campaign, a partner's batch job): plan capacity, add per-client quotas, offer a batch API.
- Abuse: make the edge rule permanent; review authentication, opaque ids, the 404-vs-403 policy, and pagination limits.
- Connection floods or slow clients: tighten server request, header, and keep-alive timeouts; cap connections per address at the proxy.
- Retry storms from our own clients: exponential backoff with jitter, and circuit breakers.
