# Replacing the mock adapter

The frontend repository boundary is `src/pro/api.ts`; schemas/types live in `src/pro/models.ts`; initial JSON lives in `src/pro/data/seed.json`. Components call typed methods and handle async loading/errors. No component should import JSON fixtures directly. Demo profile/session is not authentication; it is only a preview convenience stored in sessionStorage. Passwords are validated transiently and discarded.

## Production cutover
1. Implement Express endpoints from openapi.json, with all SECURITY/ACCEPTANCE gates. Provision Neon only on backend. Select billing/email providers and finalize their contracts.
2. Implement the same frontend interface with fetch('/api/v1/...', {credentials:'include'}), CSRF, AbortSignal, Zod response parsing, standard envelope/errors. Map metadata version/If-Match. Do not silently fallback to mocks when real APIs fail.
3. Workspace aggregate currently returned by loadWorkspace maps to paginated GET /projects,/tasks,/routines,/mixes,/preferences,/sessions; collect pages explicitly. Mutations map to resource endpoints; no production “save whole workspace” endpoint.
4. Replace preview authentication with POST /auth/login,/auth/register, email verification and GET /auth/session. Production registration returns generic202, not an authenticated account. Show verify-email screen before checkout.
5. Replace preview activation with trial or hosted checkout and server subscription polling. UI session alone cannot grant Pro. Add expired/past_due displays and cancellation/resume wiring. Remove demo buttons from production bundle.
6. Offer explicit, deduplicated import of existing guest browser data; never upload it merely because a user signs in. Keep free storage usable on logout.
7. Replace sample-session analytics with backend insights, respecting account timezone. Never mix fixture achievements into real reports. Bridge timer writes using /sessions transitions and project/task IDs.
8. Implement sync/conflict banner and bounded retries. Fetch current state on reconnect. Server rejects overlapping sessions; frontend asks user which device to continue on.
9. Build-time mock flag must be off for paid production. Run both adapters against shared contract tests and frontend integration suite. Test on actual mobile/desktop browsers.

Preview limitations: no real account, charge, email, cross-device backup/sync, tax invoice, or secure account isolation. Browser data can be cleared. Sample data is intentionally labeled; routine/planner actions affect the real local timer only after explicit user action. Integrations remain future scope.
