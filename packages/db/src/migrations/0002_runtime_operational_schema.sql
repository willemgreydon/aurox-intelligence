alter table if exists app.users
  add column if not exists email_verified_at timestamptz,
  add column if not exists last_login_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists app.auth_accounts
  add column if not exists provider_email text,
  add column if not exists access_token text,
  add column if not exists refresh_token text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists app.sessions
  add column if not exists revoked_at timestamptz,
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists app.verification_tokens
  add column if not exists user_id uuid references app.users(id) on delete cascade,
  add column if not exists used_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists assets (
  id text primary key,
  symbol text not null unique,
  name text not null,
  asset_class text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_asset_class_check check (asset_class in ('stock', 'fx'))
);

create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references assets(id) on delete cascade,
  observed_at timestamptz not null,
  open numeric(18, 6),
  high numeric(18, 6),
  low numeric(18, 6),
  close numeric(18, 6) not null,
  volume numeric(24, 6),
  created_at timestamptz not null default now()
);

create table if not exists forecasts (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references assets(id) on delete cascade,
  horizon text not null,
  directional_bias text not null,
  confidence_score numeric(5, 4) not null,
  scenario_summary text not null,
  produced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint forecasts_horizon_check check (horizon in ('short', 'medium', 'long')),
  constraint forecasts_directional_bias_check check (directional_bias in ('bullish', 'bearish', 'neutral'))
);

create table if not exists ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ingestion_runs_status_check check (status in ('pending', 'running', 'succeeded', 'failed'))
);

create table if not exists provider_sync (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,
  synced_at timestamptz,
  detail text,
  created_at timestamptz not null default now(),
  constraint provider_sync_status_check check (status in ('ok', 'warning', 'failed'))
);

create index if not exists idx_assets_asset_class on assets(asset_class);
create index if not exists idx_observations_asset_observed_at on observations(asset_id, observed_at desc);
create index if not exists idx_forecasts_asset_produced_at on forecasts(asset_id, produced_at desc);
create index if not exists idx_ingestion_runs_started_at on ingestion_runs(started_at desc);
create index if not exists idx_provider_sync_synced_at on provider_sync(synced_at desc);
