create table if not exists app.alerts (
  id uuid primary key default gen_random_uuid(),
  observation_event_id uuid references app.observation_events(id) on delete set null,
  workspace_id uuid,
  user_id uuid,
  asset_id text,
  symbol text,
  asset_class text,
  source text not null,
  category text not null,
  severity text not null,
  title text not null,
  description text not null,
  confidence numeric(6,4),
  score numeric(8,4),
  status text not null default 'OPEN',
  dedupe_key text not null,
  cooldown_bucket text not null,
  dedupe_scope text not null default 'global',
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_alerts_dedupe
  on app.alerts (dedupe_key, cooldown_bucket, dedupe_scope);

create index if not exists idx_alerts_symbol
  on app.alerts (symbol);

create index if not exists idx_alerts_last_seen
  on app.alerts (last_seen_at desc);

create table if not exists app.alert_states (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references app.alerts(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'OPEN',
  snoozed_until timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (alert_id, user_id)
);

create index if not exists idx_alert_states_user
  on app.alert_states (user_id, updated_at desc);
