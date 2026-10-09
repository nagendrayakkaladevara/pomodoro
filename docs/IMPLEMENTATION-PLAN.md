# Pomodoro Pro implementation plan

Status: plan written before implementation on October 8, 2026; frontend implementation and automated verification completed; ready for private publication.

## Product boundaries
- Existing free timer, tasks, notes, history, sounds, export and settings remain usable without an app account.
- Pro opens a pricing/benefits page first (INR 149 monthly / INR 1199 annually, proposed prices).
- Login & continue opens login, with create account and password recovery routes. Preserve chosen billing interval throughout.
- This release is a frontend preview: JSON fixtures, asynchronous typed repository, local persistence, no actual authentication, email, payments, Neon connection or cloud sync. State these limits accurately in the UI.
- Existing private Sites hosting access is separate from future product authentication.

## Ordered work
1. Write backend design, endpoint contracts, OpenAPI, database design, security requirements, acceptance tests and API migration instructions.
2. Implement typed Zod models, JSON fixtures and mock repository. Do not store/send entered passwords. Keep mock session and Pro data isolated from free timer storage.
3. Build pricing, login, registration, recovery and preview activation flow. Support back navigation, selected plan persistence, logout and protected Pro routes.
4. Build projects (create/edit/archive), planner (tasks, tags, recurrence, focus action), routines (create/edit/delete/apply), insights (date range, project totals, weekly review), studio (sound mixes, accent), and account/billing preview.
5. Connect planner tasks and recipes to the existing timer without interrupting an active or paused session. Record project attribution as session metadata. Keep sample history distinct from actual activity.
6. Verify guest access, account flow, persistence and validation, meaningful CRUD, timer integration, navigation and build. Publish privately.

## Definition of done
- Guest can focus immediately. No modal asks the guest to log in.
- Pro price shown before login. Monthly/annual choice survives auth navigation/reload.
- Mock login/create account clearly indicates no real account is created. Credentials are not persisted.
- Pro controls perform their advertised local actions; unavailable cloud/payment functions never pretend success.
- Mobile navigation wraps; labels and controls work in both themes and reduced motion is respected.
- Timer keeps running during page navigation. Routine/task actions refuse to replace an active/paused session.
- API adapter boundary and JSON fixtures are documented; backend implementation is deliberately deferred.

## Later production release gates
Implement Express/Neon, account verification and session security; verify billing provider onboarding, recurring INR payment support and tax treatment; test two-device conflicts; replace mock adapter; remove preview access; complete security review, monitoring, recovery drills and actual-device accessibility/audio checks before charging users.

## Verification result
41 automated tests passed across seven files. TypeScript and production Vite build passed. Checked all 53 API operation IDs/path parameters and 624 internal schema references; the backend is not implemented or integration-tested. Browser visual/audio/device QA was unavailable and remains a pre-production gate.
