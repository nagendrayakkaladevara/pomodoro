# Backend configuration contract

No real secrets are required for the frontend preview. This is the future Express process configuration, validated by Zod at startup. Nothing below belongs in a VITE_* variable.

| Variable | Validation / use |
|---|---|
| NODE_ENV | development, test, production |
| PORT | Integer 1–65535; hosting platform sets value |
| DATABASE_URL | Required pooled Neon PostgreSQL URL; TLS certificate verification enabled |
| MIGRATION_DATABASE_URL | Direct Neon URL; release job only, not injected into request-serving runtime |
| REDIS_URL | TLS connection for distributed limits; no in-memory production fallback |
| APP_ORIGIN | Exact HTTPS frontend origin; used for CORS, CSRF and allowed redirect construction |
| TRUST_PROXY_CIDRS | Explicit infrastructure proxy networks/hops; deployment-specific, never blindly true |
| SESSION_HASH_KEY | Cryptographically random secret >=32 bytes, supports key ID and rotation |
| TOKEN_HASH_KEY | Separate keyed-hash secret for verification/recovery tokens |
| RATE_LIMIT_KEY | Separate keyed hash for email-based rate-limit keys |
| EMAIL_PROVIDER_KEY | Secret for chosen transactional email service |
| EMAIL_FROM | Verified sender address from production domain |
| BILLING_PROVIDER_KEY | Restricted billing API secret; provider chosen before backend implementation |
| BILLING_WEBHOOK_SECRET | Provider-specific signature secret with rotation support |
| BILLING_MONTHLY_PRICE_ID | Server-side mapping to approved INR recurring monthly product |
| BILLING_ANNUAL_PRICE_ID | Server-side mapping to approved INR recurring annual product |
| EXPORT_STORAGE_* | Private export storage credentials; least-privilege bucket/prefix |
| LOG_LEVEL | Production info/warn/error; never debug body logging |

Runtime validation: reject missing/placeholder secrets in production; validate HTTPS origins, disallow credentials in redirect URLs, never log complete parsed configuration. Distinct secrets per environment. Keep plan amounts 14900 / 119900 INR minor units server-side and reconcile them with provider catalog before launch. Taxes and inclusive/exclusive price labels remain a launch decision; do not silently add charges after the user selects a plan.

Health live returns only status; readiness stays behind infrastructure access. Configure SIGTERM drain, connection close, request body/timeout limits and structured logger redaction at process bootstrap. Define billing/email/export provider adapter interfaces so provider-specific payloads do not leak into domain services.

## Zod implementation requirements

Derive runtime request and response schemas from the contracts in openapi.json or generate the OpenAPI from canonical Zod schemas; do not maintain drifting independent field rules. Use strict objects, dedicated path/query schemas and explicit output allowlists. String enum/UUID/length checks occur before repository access. Refine date ranges, unique mix sounds, at least one audible layer, permitted IANA zones and ownership-dependent foreign keys at the appropriate schema/service boundary. Zod is validation, not authorization; every query still needs owner and entitlement checks.
