# Pomodoro backend specification pack

Design specification, not a deployed backend or a security certification. Stack: Express + TypeScript, Neon PostgreSQL, Zod; a shared Redis-compatible store for production rate limits; transactional email and a hosted billing provider selected before implementation.

Read in this order:
1. `../IMPLEMENTATION-PLAN.md`: scope and delivery plan.
2. `ARCHITECTURE.md`: boundaries, modules and deployment.
3. `API.md`: semantics, status codes, auth and examples.
4. `openapi.json`: machine-readable endpoint/request/response contract.
5. `DATABASE.md` and `schema.sql`: relational design and proposed baseline DDL.
6. `SECURITY.md`: controls, rate budgets and operations.
7. `ACCEPTANCE.md`: integration/security release gates.
8. `CONFIGURATION.md`: backend environment and Zod implementation contract.
9. `FRONTEND-MIGRATION.md`: replace the mock without rewriting UI.

All amounts are integer currency minor units; all server instants are ISO 8601 UTC; planning dates are YYYY-MM-DD in the account's IANA timezone. Free features do not require these APIs. An account is needed only for Pro-related access. Account read/export remains available after Pro expires.

Decisions still needed before backend implementation: hosting region (co-locate with Neon), email provider, billing provider and tax display, data retention policy approval, monitoring provider. Never deploy browser-visible Neon credentials.
