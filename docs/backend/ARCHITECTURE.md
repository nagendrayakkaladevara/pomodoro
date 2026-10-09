# Architecture

## Runtime and modules
Deploy Express to a managed Node runtime/container, separately from the static React site. Prefer reverse-proxying `/api/v1` on the same origin for cookie/CSRF simplicity. Sites' static deployment in this release does not host the proposed Express process.

Suggested backend structure:
- src/app.ts: middleware and router construction, no listening side effect.
- src/server.ts: validated config, server, timeouts, SIGTERM drain.
- src/config/env.ts: strict Zod environment parsing, fail startup when required secrets absent.
- src/modules/{auth,accounts,billing,projects,tasks,routines,sessions,insights,mixes,sync}: route, schema, controller, service, repository files and integration specs per module.
- src/db: bounded pool, transaction helper, migrations; migrations run as a release job, not on every process startup.
- src/middleware: request ID, session, CSRF, entitlements, limits, errors.
- src/jobs: transactional outbox dispatcher, export/deletion, recurring task expansion.
- src/shared: typed errors, clock, cursor codec, idempotency, redacted logger.
- tests/{integration,security,contract}; migrations/; OpenAPI generated/checked against schemas in CI.

Controllers validate inputs and call services. Services enforce ownership, entitlements and invariants. Repositories use parameterized SQL, always constrained by owner_id. Never accept owner_id, roles, prices, entitlement or subscription status from client payloads.

## Neon
Use the pooled connection string for normal requests with TLS certificate verification. Use a separate direct connection/migration role for DDL; limit pool size and query timeouts. Runtime role cannot migrate or bypass tenant checks. Scope every read/write by owner. Composite foreign keys enforce task/project ownership. RLS is optional defense in depth; if adopted use SET LOCAL within each transaction, never session settings with transaction pooling. Backup retention depends on chosen Neon plan; validate restore capability rather than assuming it.

## Authentication
Opaque server sessions stored hashed in PostgreSQL; Secure, HttpOnly, SameSite=Lax `__Host-pomo_session` cookie (Path=/, no Domain). Session token is never returned in JSON. Rotate at authentication and reauthentication. CSRF synchronizer token bound to a short-lived pre-auth or authenticated session via GET /auth/csrf; required with Origin validation for state changes including login. Proposed idle lifetime 7 days, absolute lifetime 30 days. Production registration sends verification mail and does not grant paid access. Billing or a server-recorded eligible trial grants entitlement after verification.

## Subscription state machine
free -> trialing -> active; active -> past_due -> active or expired; active with cancelAtPeriodEnd=true stays active until periodEnd. Cancellation never deletes focus data. Server entitlements derive from verified provider state and time, never localStorage or a success URL. Trials once per account; final fraud policy and duration (proposed 14 days) configurable server-side. Account login alone never implies Pro.

Hosted checkout uses server-configured plan IDs. Webhook verifies raw bytes/signature/timestamp before parsing, persists provider event ID uniquely, applies event transactionally, acknowledges durable receipt and queues reconciliation. Handle duplicates/out-of-order events by fetching authoritative subscription state and using event version/time. Scheduled reconciliation repairs missed events. Success redirect polls GET /subscription; it cannot activate Pro itself.

## Consistency
Resources carry monotonic integer version. PATCH/DELETE require If-Match (quoted version); mismatch ->409 with currentVersion. Create/import and billing operations use Idempotency-Key scoped to owner+route, request hash and 24-hour TTL; same key/different body ->409. Mutation and change-log event share a transaction. Sync cursor is opaque, ordered by commit change sequence, not client time. Acquire a transaction-scoped per-owner advisory lock before any owner mutation/change-log insertion; release only on commit. This prevents a later allocated sequence committing ahead of an earlier owner mutation and being skipped by a cursor. A plain identity sequence alone does not guarantee commit order. Tombstones retained 90 days; cursor expired ->410 and full pull. Account deletion removes tombstones containing personal data per policy.

Only one active focus session per owner (partial unique index). Start on second device ->409 ACTIVE_SESSION_EXISTS, no silent replacement. Pause/resume/complete validate session version and server time. Offline import accepts bounded historical completion records flagged client-imported; never use imported duration as billable/proven productivity proof. Recurrence unique key (owner, template, localDate) prevents duplicate daily tasks; completion of a task does not mutate its template.
