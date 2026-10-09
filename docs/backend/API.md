# API contract

Base: `/api/v1`. OpenAPI is the field-level source of truth. This is the intended production contract; mock auth in the frontend deliberately does not simulate secure credential verification or real charges.

## Conventions
Success `{ "data": ..., "requestId": "uuid" }`. Lists also include `page.nextCursor` (null at end). Errors `{ "error": { "code": "VALIDATION_ERROR", "message": "Check the submitted fields.", "fields": { "name": ["Required"] } }, "requestId": "uuid" }`. Never return stack traces, passwords, tokens, SQL, or provider secrets. 401 unauthenticated; 403 PRO_REQUIRED/EMAIL_VERIFICATION_REQUIRED/CSRF_INVALID; 404 scoped resource absent; 409 VERSION_CONFLICT/ACTIVE_SESSION_EXISTS/IDEMPOTENCY_CONFLICT; 429 RATE_LIMITED with Retry-After seconds. Validation 400. Unexpected 500 generic. Dependency outage 503.

UUIDs identify resources. API schemas are strict; title/name trimmed but passwords never trimmed. Arrays bounded. Update payloads contain the complete editable fields specified by *Input (PATCH here is not JSON Patch). Server controls id/version/timestamps/earned. If-Match is required for versioned resource updates/deletes; 428 when absent, 409 when stale. Preferences/profile updates use last-write-wins only for their bounded independent fields. String date range must represent real calendar dates, from<=to, <=366 days, valid IANA timezone. Body limits and rates: SECURITY.md.

## Endpoints

| Method | Path | Purpose | Request schema | data schema | Success |
|---|---|---|---|---|---|
| GET | /plans | Public plan catalog | — | Plan[] | 200 |
| GET | /auth/csrf | Issue CSRF token and pre-auth cookie if absent | — | Csrf | 200 |
| POST | /auth/register | Generic registration acknowledgment; verification email if eligible | RegisterInput | Message | 202 |
| POST | /auth/login | Authenticate and rotate session cookie | LoginInput | SessionAuth | 200 |
| POST | /auth/logout | Revoke current session | — | Message | 200 |
| GET | /auth/session | Get current session | — | SessionAuth | 200 |
| POST | /auth/forgot-password | Generic reset request acknowledgment | EmailInput | Message | 202 |
| POST | /auth/reset-password | Consume reset token and revoke sessions | ResetInput | Message | 200 |
| POST | /auth/verify-email | Consume email verification token | TokenInput | Message | 200 |
| POST | /auth/resend-verification | Request verification mail | — | Message | 202 |
| POST | /auth/reauthenticate | Verify password and issue recent-auth marker | LoginInput | Message | 200 |
| GET | /me | Read owned profile | — | User | 200 |
| PATCH | /me | Update profile | ProfileInput | User | 200 |
| DELETE | /me | Request deletion after recent reauthentication | — | Message | 202 |
| GET | /subscription | Read server entitlement | — | Subscription | 200 |
| POST | /subscription/trial | Start eligible verified-account trial | PlanInput | Subscription | 201 |
| POST | /billing/checkout | Create hosted checkout; never grant Pro from redirect | PlanInput | Redirect | 201 |
| POST | /billing/portal | Create short-lived billing portal URL | — | Redirect | 200 |
| POST | /subscription/cancel | Cancel renewal, retain until period end | — | Subscription | 200 |
| POST | /subscription/resume | Resume renewal before period end | — | Subscription | 200 |
| POST | /billing/webhook | Provider-specific signed raw body; schema finalized with provider | WebhookEvent | Message | 200 |
| GET | /projects | List owned projects | — | Project[] | 200 |
| POST | /projects | Create project | ProjectInput | Project | 201 |
| GET | /projects/{id} | Read owned project | — | Project | 200 |
| PATCH | /projects/{id} | Update editable project fields (complete editable payload) | ProjectInput | Project | 200 |
| DELETE | /projects/{id} | Delete project and write tombstone | — | Message | 200 |
| GET | /tasks | List owned tasks | — | Task[] | 200 |
| POST | /tasks | Create task | TaskInput | Task | 201 |
| GET | /tasks/{id} | Read owned task | — | Task | 200 |
| PATCH | /tasks/{id} | Update editable task fields (complete editable payload) | TaskInput | Task | 200 |
| DELETE | /tasks/{id} | Delete task and write tombstone | — | Message | 200 |
| GET | /routines | List owned routines | — | Routine[] | 200 |
| POST | /routines | Create routine | RoutineInput | Routine | 201 |
| GET | /routines/{id} | Read owned routine | — | Routine | 200 |
| PATCH | /routines/{id} | Update editable routine fields (complete editable payload) | RoutineInput | Routine | 200 |
| DELETE | /routines/{id} | Delete routine and write tombstone | — | Message | 200 |
| GET | /mixes | List owned mixes | — | Mix[] | 200 |
| POST | /mixes | Create mix | MixInput | Mix | 201 |
| GET | /mixes/{id} | Read owned mix | — | Mix | 200 |
| PATCH | /mixes/{id} | Update editable mix fields (complete editable payload) | MixInput | Mix | 200 |
| DELETE | /mixes/{id} | Delete mix and write tombstone | — | Message | 200 |
| GET | /preferences | Read preferences | — | Preferences | 200 |
| PATCH | /preferences | Update preferences | Preferences | Preferences | 200 |
| GET | /sessions | List completed and active sessions | — | Session[] | 200 |
| POST | /sessions | Start one server-coordinated focus session | SessionStart | Session | 201 |
| PATCH | /sessions/{id} | Transition active session using server clock | SessionAction | Session | 200 |
| GET | /insights | Report owned completed focus time | — | Insights | 200 |
| POST | /imports | Explicitly import local history without duplicates | ImportInput | ImportResult | 201 |
| GET | /sync | Pull changes since cursor; expired cursor is 410 | — | SyncResult | 200 |
| POST | /exports | Queue complete owned data export; allowed after expiration | — | ExportJob | 202 |
| GET | /exports/{id} | Read export job and expiring signed download | — | ExportJob | 200 |
| GET | /health/live | Liveness | — | Health | 200 |
| GET | /health/ready | Internal-only dependency readiness | — | Health | 200 |

## Representative payloads

Create project: `POST /projects`, authenticated, Pro entitlement, X-CSRF-Token and Idempotency-Key required.
```json
{"name":"Portfolio","description":"A little better each day","color":"sage","weeklyGoalMinutes":300,"archived":false}
```
201 response:
```json
{"data":{"id":"11111111-1111-4111-8111-111111111111","name":"Portfolio","description":"A little better each day","color":"sage","weeklyGoalMinutes":300,"archived":false,"version":1,"createdAt":"2026-10-08T10:00:00Z","updatedAt":"2026-10-08T10:00:00Z"},"requestId":"22222222-2222-4222-8222-222222222222"}
```
Task input:
```json
{"title":"Review navigation","projectId":"11111111-1111-4111-8111-111111111111","estimate":2,"plannedDate":"2026-10-08","tags":["design"],"recurrence":"weekdays","done":false}
```
Successful login response sets the secure session cookie (not shown in JSON):
```json
{"data":{"user":{"id":"33333333-3333-4333-8333-333333333333","name":"Demo User","email":"demo@example.com","emailVerified":true,"timezone":"Asia/Kolkata","createdAt":"2026-10-08T10:00:00Z"},"subscription":{"planId":"pro_monthly","status":"trialing","currentPeriodEnd":"2026-10-22T10:00:00Z","cancelAtPeriodEnd":false,"entitlements":["projects","routines","planner","insights","mixes","sync"]}},"requestId":"22222222-2222-4222-8222-222222222222"}
```
403 example:
```json
{"error":{"code":"PRO_REQUIRED","message":"An active Pro plan is required for this action."},"requestId":"22222222-2222-4222-8222-222222222222"}
```

## Invariants and future services
- Project archival preserves history; archived projects cannot receive new planned tasks. Deletion unlinks owned tasks/sessions transactionally and retains display-name snapshots; never cascade-delete completed history from a project action.
- Task estimate is remaining-planning input; earned reflects completed sessions only. A recurring task creates at most one occurrence per account local date; missed days are not retroactively generated. Deleting an occurrence stops only that occurrence; editing recurrence to none disables future generation from that template (separate template API may be added when scheduling service is implemented).
- Routines apply in the frontend only while no active/paused timer exists. Applying a routine does not start a session. Duplicate template tasks are skipped via source identifiers, not titles.
- Sound mixes max three unique sounds, each 0–1, at least one nonzero. User-entered URLs/audio uploads excluded.
- Session completion validates endAt <= serverNow; cannot complete paused/cancelled session; duplicate transition returns same completed record. Time cannot be credited twice.
- Recurring generation, exports and mail use outbox/jobs; billing webhook schema is an integration placeholder until provider selected, not a runnable provider contract.
- Integrations, team accounts, native notifications and website blocking are not in this release.
