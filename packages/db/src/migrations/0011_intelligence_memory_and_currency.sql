alter table app.simulation_accounts
  drop constraint if exists simulation_accounts_currency_check;

alter table app.simulation_accounts
  alter column base_currency set default 'EUR';

alter table app.simulation_accounts
  add constraint simulation_accounts_currency_check
  check (base_currency in ('USD', 'EUR'));

create table if not exists app.asset_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  asset_ids jsonb not null default '[]'::jsonb,
  symbols jsonb not null default '[]'::jsonb,
  time_window_start timestamptz,
  time_window_end timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  explanation text not null,
  confidence numeric(5,4) not null default 0,
  version_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists app.lane_snapshots (
  id uuid primary key default gen_random_uuid(),
  lane_id text not null,
  source_type text not null,
  source_id text not null,
  asset_ids jsonb not null default '[]'::jsonb,
  symbols jsonb not null default '[]'::jsonb,
  time_window_start timestamptz,
  time_window_end timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  explanation text not null,
  confidence numeric(5,4) not null default 0,
  version_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists app.signal_decision_traces (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  asset_ids jsonb not null default '[]'::jsonb,
  symbols jsonb not null default '[]'::jsonb,
  time_window_start timestamptz,
  time_window_end timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  explanation text not null,
  confidence numeric(5,4) not null default 0,
  version_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists app.broker_decision_traces (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  asset_ids jsonb not null default '[]'::jsonb,
  symbols jsonb not null default '[]'::jsonb,
  time_window_start timestamptz,
  time_window_end timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  explanation text not null,
  confidence numeric(5,4) not null default 0,
  version_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists app.news_items (
  id text primary key,
  title text not null,
  source text not null,
  url text not null,
  published_at timestamptz not null,
  symbols jsonb not null default '[]'::jsonb,
  asset_ids jsonb not null default '[]'::jsonb,
  asset_class text,
  summary text not null,
  sentiment_score numeric(6,4),
  relevance_score numeric(6,4),
  risk_tags jsonb not null default '[]'::jsonb,
  extracted_entities jsonb not null default '[]'::jsonb,
  version_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists app.news_impact_traces (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  asset_ids jsonb not null default '[]'::jsonb,
  symbols jsonb not null default '[]'::jsonb,
  time_window_start timestamptz,
  time_window_end timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  explanation text not null,
  confidence numeric(5,4) not null default 0,
  version_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists app.report_artifacts (
  id uuid primary key default gen_random_uuid(),
  artifact_type text not null,
  source_type text not null,
  source_id text not null,
  asset_ids jsonb not null default '[]'::jsonb,
  symbols jsonb not null default '[]'::jsonb,
  time_window_start timestamptz,
  time_window_end timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  explanation text not null,
  confidence numeric(5,4) not null default 0,
  version_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists app.intelligence_memory_chunks (
  id uuid primary key default gen_random_uuid(),
  chunk_type text not null,
  source_type text not null,
  source_id text not null,
  asset_ids jsonb not null default '[]'::jsonb,
  symbols jsonb not null default '[]'::jsonb,
  time_window_start timestamptz,
  time_window_end timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  explanation text not null,
  confidence numeric(5,4) not null default 0,
  version_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_asset_snapshots_created_at on app.asset_snapshots(created_at desc);
create index if not exists idx_lane_snapshots_created_at on app.lane_snapshots(created_at desc);
create index if not exists idx_signal_decision_traces_created_at on app.signal_decision_traces(created_at desc);
create index if not exists idx_broker_decision_traces_created_at on app.broker_decision_traces(created_at desc);
create index if not exists idx_news_items_published_at on app.news_items(published_at desc);
create index if not exists idx_news_impact_traces_created_at on app.news_impact_traces(created_at desc);
create index if not exists idx_report_artifacts_created_at on app.report_artifacts(created_at desc);
create index if not exists idx_intelligence_memory_chunks_created_at on app.intelligence_memory_chunks(created_at desc);
