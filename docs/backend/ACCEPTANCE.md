# Backend acceptance specification

These are future Express integration/security test cases; they are not claimed to have run against a backend.

## Public and identity
- Guest can fetch plans without a session. No API calls required to run free timer.
- Register accepts valid strict input, generic 202 for existing/new address; verified email needed for trial/checkout.
- Wrong/unknown login returns indistinguishable 401; succeeds only against a real password hash; rotates cookie and CSRF token.
- Logout revokes cookie server-side; replay is rejected. Reset token expires/is one-time; reset revokes all sessions.
- Forged Origin/missing CSRF blocked on login and authenticated mutation. Cookie flags asserted. No secret appears in logs, responses, telemetry or bundle.
- Abuse budgets verified across two server instances and IPv6 variants; limiter outage behaves per policy.

## Ownership and data
- Account A cannot GET/PATCH/DELETE/export or link Account B resources; collection query cannot leak B.
- Unknown fields, oversized arrays/body, invalid dates/timezones, SQL metacharacters and prototype keys cannot bypass validation.
- Cursor pagination has stable ordering, no duplicate records; ranges <=366 days.
- Stale If-Match ->409; missing ->428; idempotent retry returns same result; different body with same key ->409.
- Recurrence creates one occurrence/day and honors local weekdays/DST without backfill.
- Archive preserves history; deleting task/project doesn't remove completed session snapshots.
- Two simultaneous session starts yield one success/one409. Early/paused completion rejected, duplicate completion credited once.
- Imports deduplicate client IDs; invalid batch atomic or explicit bounded failures (initial policy atomic).
- Sync mutation/log transaction atomic; tombstones visible; expired cursor410 initiates full pull.

## Billing
- Client cannot set price or entitlement. Redirect to success alone grants nothing.
- Invalid signature/replay/out-of-order/duplicate webhook tests. Unknown provider event safely acknowledged after verified durable recording.
- Cancel retains access until period end; expires by server time; read/export remains allowed.
- Provider downtime causes retriable error, not invented success. Reconciliation fixes missed events.

## Operations
- Migrations and restore tested in isolated Neon branch. Pool exhaustion/query timeout/shutdown tested.
- Export download short-lived, owner-scoped; formula-injection CSV escaped.
- Account deletion revokes sessions, schedules provider cancellation and deletion; handles retries.
- Dependency/secret scanning and contract drift check in CI. Load targets set from expected launch traffic; security review before production.
