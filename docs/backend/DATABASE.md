# Database design

`schema.sql` is a proposed baseline, not a migration applied to a live database. PostgreSQL UUIDs, timestamptz instants, local planning dates, integer minor-unit prices in server plan configuration. Currency provider identifiers are never client-controlled.

- users -> auth_sessions/auth_tokens: authentication only; no passwords in API responses.
- users -> subscriptions: one current subscription; provider event history recorded separately.
- users -> projects -> tasks: composite owner foreign keys prevent cross-account relations.
- task_templates -> tasks: one occurrence/local date, composite foreign key prevents links to another owner’s template. Unlink occurrences transactionally before deleting a template. Deleted occurrences need tombstones to prevent regeneration on the same date.
- focus_sessions: title/project snapshots preserve historical context; service unlinks child references before deleting projects/tasks. Task deletion must not delete earned history.
- routines/mixes/preferences: bounded, validated configuration. JSONB layer/settings fields require strict Zod validation before writes, not arbitrary JSON acceptance.
- change_log: transactional incremental sync; owner+sequence indexes; record tombstones on delete.
- outbox/exports: bounded background jobs with retry/dead-letter policy; object storage chosen at implementation, never public permanent exports.
- webhook_events/idempotency_keys: durable deduplication and reconciliation. Purge idempotency records after 24h; redact/minimize webhook payload storage.
- audit_events: security/billing events only, exclude credentials, notes, task text and payment details.

All versioned updates increment version and updated_at atomically; add WHERE owner_id=$owner AND id=$id AND version=$expected. Zero affected rows distinguished internally but respond scoped 404/409 safely. Baseline SQL does not create application DB roles or RLS: those are deployment migrations, never grant superuser to runtime.

Migration gates: validate constraints/indexes on staging, query plans against realistic account sizes, test timezone/DST boundaries, deletion ordering, project archival, recurrence deduplication and one-active-session uniqueness. Migrations are forward-only with tested recovery; use a new Neon branch for trial migrations. Restore drills and chosen plan retention must be documented before launch.

The routine API field `interval` maps to SQL `long_break_interval`. API task `recurrence` is read from its owned task template (none for non-recurring tasks). Owner advisory locks serialize change-log writes as specified in ARCHITECTURE.md; identity sequences do not by themselves impose commit order.
