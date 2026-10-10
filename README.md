# Pomodoro — A little focus

A small React + TypeScript focus space, designed with the same Geist typeface, centered layout, neutral colors, fine borders, and warm dark theme as Sai Nagendra’s portfolio.

## Run locally

Requires Node.js 22.12+ and pnpm. The lockfile pins all dependencies.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

```bash
pnpm test
pnpm build
pnpm exec vite preview
```

## Included

- A custom Three.js tomato with a separately rotating upper half, fixed base, leafy crown, and dial marks. Touch or click the upper half before a session to preview 00:00, then drag left to add minutes or right to subtract. Repeat swipes for longer durations. Set time applies the draft; Cancel or Escape restores the previous duration. Running and paused sessions are locked. Keyboard users can focus the dial, press Enter, adjust with arrow keys, and press Enter to apply. Reduced motion is respected, with an SVG fallback without WebGL.
- Focus, short break, and long break modes; configurable durations, long-break interval, daily goal, and optional automatic breaks.
- Absolute-deadline timing, pause/resume, refresh recovery, confirmation before abandoning sessions, and a countdown in the browser title.
- Tasks with estimated and completed tomatoes; an optional selected task is snapshotted into each session.
- Daily totals, a seven-day history, and CSV export. Only completed focus sessions earn a tomato.
- Distraction notes, a focus-only view, keyboard shortcuts, optional completion chimes, and synthesized rain, brown noise, ocean waves, Gentle keys, Music box, and Slow drift. The latter three are original synthesized melodies with looped release tails; each sound can be previewed for eight seconds before starting a session.
- Responsive layout and shadcn/ui Button, Dialog, Input, Select, Switch, and Tabs components built with Radix primitives.

- An info icon opens a dedicated `#/features` guide; the active timer continues while reading. Footer attribution links to Sai Nagendra’s existing `portfolio-v2` repository.
- Motion for React animates page entry, duration controls, goal progress, and completion feedback, respecting reduced-motion preferences.

## Architecture

`src/lib/model.ts` owns the typed reducer and Zod-validated persistence schema. `use-focus.ts` coordinates browser persistence, wall-clock updates, audio, and cross-tab storage events. `audio.ts` owns a lazily initialized Web Audio context. `use-tomato-dial.ts` handles pointer capture, repeated swipes, cancellation, and keyboard controls. `dial.ts` owns duration limits and gesture arithmetic. `synthesis.ts` creates original loopable melodies and ambient textures without remote audio requests. UI components live under `src/components`; shadcn sources live under `components/ui`.

State is stored under `little-focus:v1` in localStorage. No backend, account database, analytics, or third-party sound requests are used. Storage is specific to this browser and origin; there is no cloud sync. Up to 200 tasks and the latest 5,000 completed sessions are retained. The latest 30 sessions appear in History; CSV export contains all retained sessions.

Timing is computed from `endAt - Date.now()`, never by decrementing a counter. Waking a sleeping tab records at most its current completed session, then prepares a break; it never fabricates unattended sessions. Automatic breaks only begin after a timely foreground completion. New focus sessions always require a deliberate start. Changing duration settings leaves an active or paused session intact. A dialed duration affects only the upcoming session and persists on refresh; theme and sound changes do not overwrite it. Defaults in Settings remain unchanged.

Browser audio is enabled through user interaction. Closing the app stops audio, and operating-system suspension or screen locking can delay completion sounds. Reopening recovers the timer using the saved deadline. A system clock change affects a wall-clock timer. Multi-tab storage events keep views updated; simultaneous edits in separate tabs follow the last saved update. Use one tab when editing a running session.

## Verification

Vitest covers deadline drift, pause/resume and serialization, exact-boundary completion, long-break scheduling, background recovery, skipped sessions, task attribution, duration changes, validation, and core UI workflows, including features-page navigation, shadcn sound selection, pointer and keyboard duration controls, cancellation, duration limits, and audio sample integrity. Browser visual QA was unavailable in the creation environment; the WebGL scene and real-device audio should be checked on target devices.

## Deployment

Live site: https://nagendrayakkaladevara.github.io/pomodoro/

Pushes to `main` automatically test, build, and deploy the static Vite app through `.github/workflows/deploy-pages.yml`. GitHub Pages uses the GitHub Actions source. Build output is `dist/`, and Vite's `base` is `/pomodoro/` for the repository's subdirectory URL.


## Pro frontend preview

Open Pro in the header: pricing and benefits → Login & continue → login/create account → Open Pro preview. Proposed prices are ₹149/month or ₹1,199/year. “Explore with demo account” skips typing demo credentials. Existing free features require no application login.

- Projects: create/edit/archive/restore, descriptions, colors and weekly targets.
- Planner: dates, project filtering, tags, tomato estimates, completion, edit/delete, daily/weekday recurrence and an estimated finish time. Focus prepares the existing timer with the selected task, without starting it automatically.
- Routines: create/edit/delete/apply durations, break interval, background sound and optional task templates. Applying never replaces a running/paused session.
- Insights: 7/30/90/365-day reports, project filtering, time distribution, active days, estimates versus completed time, a quiet review and JSON export. My focus and Sample data stay separate. Completed sessions snapshot project IDs.
- Studio: up to three independently controlled sound layers, 30-second preview, saved mixes, Use for focus and accent choices. Timer mixes respect master volume and stop on pause. Ordinary sound selection clears the mix.
- Account: weekly goal, local export, confirmed reset, billing/cancellation preview and logout. No card or payment is collected.

`src/pro/data/seed.json` supplies illustrative data; `src/pro/api.ts` is the asynchronous repository boundary; `src/pro/models.ts` validates forms and persisted data with Zod. Mock profile metadata is in sessionStorage (`little-focus:demo-profile:v1`), passwords are transient and never saved or sent. Workspace JSON persists separately under `little-focus:pro-preview:v1`. This is one local demo workspace, not secure multi-user authentication. Reload within the same tab retains the demo session; closing the tab may end it.

Cloud sync, real authentication, email delivery, secure entitlements and recurring billing are **not implemented** in this frontend release. Future backend: Express + TypeScript + Neon PostgreSQL. See `docs/IMPLEMENTATION-PLAN.md` and `docs/backend/README.md` for architecture, 53 endpoint contracts in OpenAPI, proposed DDL, security requirements, acceptance criteria and the adapter migration guide. The backend specifications have not been run against a real database.

Pro is lazy-loaded; the free timer remains the landing page. Automated tests cover Pro account/pricing navigation, data isolation, project/planner actions, routine protection, insights, sound-mix handoff and recurrence. Browser visual and actual-device audio checks remain outstanding in this environment.
