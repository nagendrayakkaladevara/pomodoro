-- Proposed baseline, review and run in an isolated Neon branch before production.
-- No database is contacted by the frontend preview.
BEGIN;
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, normalized_email text NOT NULL UNIQUE,
 name varchar(80) NOT NULL CHECK (length(trim(name))>0), password_hash text NOT NULL,
 timezone varchar(80) NOT NULL DEFAULT 'UTC', email_verified_at timestamptz,
 deletion_requested_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, csrf_hash text NOT NULL, recent_auth_at timestamptz,
 expires_at timestamptz NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_sessions_owner ON auth_sessions(owner_id);
CREATE TABLE auth_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('verify','reset')), token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL, consumed_at timestamptz
);
CREATE TABLE subscriptions (
 owner_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE, plan_id text CHECK(plan_id IN ('pro_monthly','pro_annual')),
 status text NOT NULL DEFAULT 'free' CHECK(status IN ('free','trialing','active','past_due','expired')),
 provider_customer_id text UNIQUE, provider_subscription_id text UNIQUE, current_period_end timestamptz,
 cancel_at_period_end boolean NOT NULL DEFAULT false, trial_started_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 name varchar(80) NOT NULL CHECK(length(trim(name))>0), description varchar(500) NOT NULL DEFAULT '',
 color text NOT NULL CHECK(color IN ('tomato','sage','blue','amber')), weekly_goal_minutes integer NOT NULL CHECK(weekly_goal_minutes BETWEEN 30 AND 6000),
 archived boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id,id)
);
CREATE TABLE task_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 title varchar(160) NOT NULL, project_id uuid, estimate integer NOT NULL CHECK(estimate BETWEEN 1 AND 12),
 tags text[] NOT NULL DEFAULT '{}', recurrence text NOT NULL CHECK(recurrence IN ('daily','weekdays')), enabled boolean NOT NULL DEFAULT true,
 FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id), UNIQUE(owner_id,id)
);
CREATE TABLE tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 project_id uuid, title varchar(160) NOT NULL CHECK(length(trim(title))>0), estimate integer NOT NULL CHECK(estimate BETWEEN 1 AND 12),
 earned integer NOT NULL DEFAULT 0 CHECK(earned>=0), planned_date date NOT NULL, tags text[] NOT NULL DEFAULT '{}' CHECK(cardinality(tags)<=5),
 recurrence_template_id uuid, done boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,id), UNIQUE(owner_id,recurrence_template_id,planned_date),
 FOREIGN KEY(owner_id,recurrence_template_id) REFERENCES task_templates(owner_id,id), FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id)
);
CREATE INDEX tasks_owner_day ON tasks(owner_id,planned_date,id);
CREATE TABLE routines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 name varchar(80) NOT NULL, focus integer NOT NULL CHECK(focus BETWEEN 1 AND 120), short integer NOT NULL CHECK(short BETWEEN 1 AND 30),
 long integer NOT NULL CHECK(long BETWEEN 1 AND 60), long_break_interval integer NOT NULL CHECK(long_break_interval BETWEEN 2 AND 8),
 ambient text NOT NULL CHECK(ambient IN ('off','rain','brown','ocean','piano','music-box','drift')), task_titles text[] NOT NULL DEFAULT '{}' CHECK(cardinality(task_titles)<=12),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mixes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 name varchar(80) NOT NULL, layers jsonb NOT NULL CHECK(jsonb_typeof(layers)='array' AND jsonb_array_length(layers) BETWEEN 1 AND 3),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE focus_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 task_id uuid, project_id uuid, task_title varchar(160) NOT NULL, project_name_snapshot varchar(80), device_id uuid,
 status text NOT NULL CHECK(status IN ('running','paused','completed','cancelled')),
 duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 1 AND 120), remaining_ms integer NOT NULL CHECK(remaining_ms BETWEEN 0 AND 7200000),
 started_at timestamptz NOT NULL, end_at timestamptz, completed_at timestamptz, imported boolean NOT NULL DEFAULT false, client_id uuid,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,client_id), FOREIGN KEY(owner_id,task_id) REFERENCES tasks(owner_id,id), FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id),
 CHECK((status='completed')=(completed_at IS NOT NULL)), CHECK(remaining_ms<=duration_minutes*60000)
);
CREATE UNIQUE INDEX one_active_focus_per_owner ON focus_sessions(owner_id) WHERE status IN ('running','paused');
CREATE INDEX focus_sessions_report ON focus_sessions(owner_id,completed_at DESC,id);
CREATE TABLE preferences (
 owner_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE, weekly_goal_minutes integer NOT NULL DEFAULT 600 CHECK(weekly_goal_minutes BETWEEN 30 AND 6000),
 accent text NOT NULL DEFAULT 'tomato' CHECK(accent IN ('tomato','sage','blue','amber')),
 week_starts_on text NOT NULL DEFAULT 'monday' CHECK(week_starts_on IN ('monday','sunday')),
 timer_settings jsonb NOT NULL DEFAULT '{}', note varchar(2000) NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE webhook_events (
 provider_event_id text PRIMARY KEY, provider text NOT NULL, payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz, failure_code text
);
CREATE TABLE idempotency_keys (
 owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE, route text NOT NULL, key uuid NOT NULL, request_hash text NOT NULL,
 response_status integer, response_body jsonb, expires_at timestamptz NOT NULL, PRIMARY KEY(owner_id,route,key)
);
CREATE TABLE change_log (
 sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 entity text NOT NULL, entity_id uuid NOT NULL, version integer NOT NULL, deleted boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX change_log_owner_cursor ON change_log(owner_id,sequence);
CREATE TABLE outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, owner_id uuid REFERENCES users ON DELETE CASCADE,
 payload jsonb NOT NULL, attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
CREATE TABLE exports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('pending','ready','failed')), object_key text, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, owner_id uuid REFERENCES users ON DELETE SET NULL,
 action text NOT NULL, request_id uuid NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
