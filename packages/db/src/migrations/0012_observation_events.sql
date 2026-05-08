create table if not exists app.observation_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid,
  asset_id text,
  symbol text,
  asset_class text,
  source text not null,
  event_type text not null,
  severity text not null,
  title text not null,
  description text not null,
  confidence numeric(6,4),
  score numeric(8,4),
  related_signal_id text,
  related_news_id text,
  related_risk_id text,
  related_decision_id text,
  related_order_id text,
  metadata jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  bucket_hour timestamptz not null,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_observation_events_dedupe
  on app.observation_events(fingerprint, bucket_hour);
create index if not exists idx_observation_events_observed_at
  on app.observation_events(observed_at desc);
create index if not exists idx_observation_events_source
  on app.observation_events(source);
create index if not exists idx_observation_events_symbol
  on app.observation_events(symbol);

create table if not exists app.observation_event_states (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references app.observation_events(id) on delete cascade,
  user_id uuid not null,
  is_read boolean not null default false,
  is_pinned boolean not null default false,
  is_dismissed boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_observation_event_states_user
  on app.observation_event_states(user_id, updated_at desc);
