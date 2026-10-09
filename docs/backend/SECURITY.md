# Production security requirements

These are required implementation and verification gates, not claims that a static preview has them.

## Validation and access
- Strict Zod objects for params/query/body and environment. Reject unknown fields, bound strings/arrays/page sizes/date spans and coerce only explicitly supported query types. UUID path validation. Reject malformed JSON (400), unsupported media types (415), oversized bodies (413).
- Parameterized SQL; allowlist sort columns. Escaped React text output, no raw user HTML. CSV formula neutralization. Ownership on every resource/query/export; cross-user IDs yield 404, not existence leaks.
- Require authenticated session plus server entitlement for Pro writes; allow owned reads/export/billing/cancellation for expired members. Verify CSRF token and exact Origin for unsafe cookie-auth requests. GET never mutates resources.
- TLS, Helmet, explicit CSP, HSTS at TLS edge, no X-Powered-By, no detailed stack/SQL errors to clients. CORS exact frontend allowlist with credentials; never wildcard. Set trust proxy only to the real proxy topology; reject forged forwarded identity.

## Accounts
- Production password length 15–128 characters, allow paste/password managers and Unicode; do not trim/transform passwords. Check breached passwords using a privacy-preserving approach; no mandatory symbol composition rules. Argon2id with per-password salt, benchmark at least OWASP baseline (19 MiB, 2 iterations, parallelism 1).
- Login failure generic regardless of unknown user/wrong password; comparable timing via dummy hash verification. Register/recovery acknowledgments generic to resist enumeration.
- Hash one-time email verification/reset tokens; verification expires 24h, reset 30min; atomic consume, retry limits, never log tokens. Reset revokes all sessions. Reauthentication (within 5min) required for account deletion/password changes.
- Session IDs from >=32 random bytes, hash at rest, rotate on login, revoke on logout, enforce idle/absolute expiration server-side. Secure HttpOnly host-only cookies, no access tokens in localStorage.
- Email verification before trial/checkout. Mail via transactional outbox, recipient throttles, SPF/DKIM/DMARC for production domain. No secrets in frontend variables.

## Initial rate budgets (tune from telemetry)
All API routes covered by global per-IP limit 120 requests/min; authenticated general budget 240/min/user. Distributed atomic limiter with Redis; IPv6 subnet normalization, Retry-After and RateLimit headers, JSON 429 envelope. Never use a process-only memory store in a multi-instance production deployment.

| Route family | Additional budget |
|---|---|
| Login | 5 failed attempts /15min/email+IP, 30 attempts/15min/IP, incremental backoff |
| Register/recovery/verify resend | 5/hour/IP and 3/hour/normalized-email (store keyed hash) |
| Reset/verify token consumption | 10/15min/IP |
| Checkout/trial/portal | 5/10min/user |
| Pro mutations | 60/min/user |
| Import | 5/hour/user, <=200 tasks and <=1000 sessions per batch, 1 MiB |
| Insights | 30/min/user; range <=366 days |
| Export | 3/hour/user, 1 concurrent export |
| Webhook | separate provider-aware edge budget 600/min; signature always required; do not trust IP alone |
| Health endpoints | edge/internal budget; readiness only inside infrastructure |

Limiter outage: fail closed (503) on auth/billing/writes; permit bounded cached/read-only responses only under explicit degraded policy. Do not log email/password in limiter keys. Limits are abuse controls, not substitutes for resource ownership or billing checks.

## Reliability and operations
- Default JSON body max 64 KiB, dedicated bounded import parser 1 MiB, raw webhook parser <=256 KiB before global JSON parser. Request timeout 15s, database statement timeout 5s, bounded pools/queues.
- Webhooks idempotent, signed and replay-window checked; checkout return URLs from server allowlist only. Never collect card numbers. Audit billing changes without sensitive payloads.
- Store secrets in hosting secret manager, rotate; separate dev/staging/prod Neon projects or branches with least-privilege roles; no production data in fixtures. Lock dependency versions, scan dependencies/secrets in CI, patch routinely.
- Structured logs with request IDs; redact passwords, Authorization, Cookie, Set-Cookie, tokens, database URL and request bodies. Track error/latency/429/webhook backlog, alert on anomalies.
- Readiness checks database/essential dependencies without exposing internals. Graceful shutdown, bounded retries with jitter for safe operations, restore drill before launch. Agree retention: proposed deletion completes in 30 days; backups age out per documented policy; billing records retained only as legally required.
- Security review and actual threat-based testing required before charging. No promise of “all security” or zero risk.

## Primary references (reviewed 2026-10-08)
- https://expressjs.com/en/advanced/best-practice-security/
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://neon.com/docs/connect/connection-pooling
