create table if not exists app.simulation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  lane_id text not null,
  lane_mode text not null,
  status text not null default 'draft',
  observation_status text not null default 'idle',
  observation_message text,
  asset_scope text not null default 'stock',
  max_capital_usd numeric(18, 2) not null default 0,
  micro_allocation_percent numeric(6, 2) not null default 0,
  decision_source text not null default 'manual_ui',
  last_heartbeat_at timestamptz,
  started_at timestamptz,
  paused_at timestamptz,
  stopped_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulation_sessions_lane_id_check check (
    lane_id in (
      'manual_stock_lane',
      'manual_multi_asset_lane',
      'ai_copilot_lane',
      'signal_follow_lane',
      'agent_sandbox_lane'
    )
  ),
  constraint simulation_sessions_lane_mode_check check (lane_mode in ('manual', 'ai-assisted', 'strategy')),
  constraint simulation_sessions_status_check check (
    status in (
      'draft',
      'starting',
      'running',
      'paused',
      'stopping',
      'stopped',
      'completed',
      'failed'
    )
  ),
  constraint simulation_sessions_observation_status_check check (
    observation_status in ('idle', 'warming', 'watching', 'degraded', 'error')
  ),
  constraint simulation_sessions_asset_scope_check check (asset_scope in ('stock', 'etf', 'crypto', 'multi-asset')),
  constraint simulation_sessions_decision_source_check check (
    decision_source in ('manual_ui', 'ai_assisted', 'automation')
  )
);

create index if not exists idx_simulation_sessions_user_updated_at
  on app.simulation_sessions(user_id, updated_at desc);

create unique index if not exists uq_simulation_sessions_user_lane_active
  on app.simulation_sessions(user_id, lane_id)
  where status in ('draft', 'starting', 'running', 'paused', 'stopping');
