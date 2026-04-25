create table if not exists app.simulation_agent_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  session_id uuid references app.simulation_sessions(id) on delete set null,
  lane_id text,
  autonomy_mode text not null,
  mode_id text not null,
  request_context jsonb not null default '{}'::jsonb,
  ranked_assets jsonb not null default '[]'::jsonb,
  decision_payload jsonb not null,
  decision_action text not null,
  simulation_only boolean not null default true,
  requires_human_confirmation boolean not null default true,
  max_notional_per_trade numeric(18, 2) not null default 0,
  max_daily_notional numeric(18, 2) not null default 0,
  max_open_exposure numeric(18, 2) not null default 0,
  used_daily_notional numeric(18, 2),
  proposed_notional numeric(18, 2),
  cap_check_status text not null default 'not_applicable',
  cap_check_reason text,
  execution_intent_status text not null default 'not_submitted',
  error_code text,
  error_message text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulation_agent_decisions_autonomy_mode_check check (
    autonomy_mode in ('suggest_only', 'human_confirmed', 'autonomous_simulation')
  ),
  constraint simulation_agent_decisions_action_check check (
    decision_action in ('HOLD', 'PROPOSE_BUY', 'PROPOSE_SELL', 'SIMULATED_BUY_REQUEST', 'SIMULATED_SELL_REQUEST')
  ),
  constraint simulation_agent_decisions_lane_id_check check (
    lane_id is null or lane_id in (
      'manual_stock_lane',
      'manual_multi_asset_lane',
      'ai_copilot_lane',
      'signal_follow_lane',
      'agent_sandbox_lane'
    )
  ),
  constraint simulation_agent_decisions_simulation_only_check check (simulation_only = true),
  constraint simulation_agent_decisions_cap_check_status_check check (
    cap_check_status in ('not_applicable', 'passed', 'rejected', 'failed')
  ),
  constraint simulation_agent_decisions_execution_intent_status_check check (
    execution_intent_status in (
      'not_submitted',
      'submitted',
      'rejected_by_cap',
      'rejected_by_risk',
      'rejected_read_only',
      'error'
    )
  ),
  constraint simulation_agent_decisions_max_notional_per_trade_check check (max_notional_per_trade >= 0),
  constraint simulation_agent_decisions_max_daily_notional_check check (max_daily_notional >= 0),
  constraint simulation_agent_decisions_max_open_exposure_check check (max_open_exposure >= 0),
  constraint simulation_agent_decisions_used_daily_notional_check check (
    used_daily_notional is null or used_daily_notional >= 0
  ),
  constraint simulation_agent_decisions_proposed_notional_check check (
    proposed_notional is null or proposed_notional >= 0
  )
);

create index if not exists idx_sim_agent_decisions_user_requested_at
  on app.simulation_agent_decisions(user_id, requested_at desc);
create index if not exists idx_sim_agent_decisions_session_requested_at
  on app.simulation_agent_decisions(session_id, requested_at desc);
create index if not exists idx_sim_agent_decisions_lane_requested_at
  on app.simulation_agent_decisions(lane_id, requested_at desc);
create index if not exists idx_sim_agent_decisions_action
  on app.simulation_agent_decisions(decision_action);

create table if not exists app.simulation_agent_order_links (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references app.simulation_agent_decisions(id) on delete cascade,
  order_id uuid not null references app.simulation_orders(id) on delete cascade,
  link_type text not null,
  created_at timestamptz not null default now(),
  constraint simulation_agent_order_links_link_type_check check (
    link_type in ('autonomous_submission', 'human_confirmation')
  ),
  constraint simulation_agent_order_links_decision_order_unique unique (decision_id, order_id)
);

create index if not exists idx_sim_agent_order_links_order_id
  on app.simulation_agent_order_links(order_id);
create index if not exists idx_sim_agent_order_links_decision_id
  on app.simulation_agent_order_links(decision_id);

create table if not exists app.simulation_agent_daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  session_id uuid references app.simulation_sessions(id) on delete set null,
  lane_id text,
  usage_date date not null,
  strategy_tag text not null,
  source text not null,
  notional_used numeric(18, 2) not null default 0,
  order_count integer not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulation_agent_daily_usage_lane_id_check check (
    lane_id is null or lane_id in (
      'manual_stock_lane',
      'manual_multi_asset_lane',
      'ai_copilot_lane',
      'signal_follow_lane',
      'agent_sandbox_lane'
    )
  ),
  constraint simulation_agent_daily_usage_source_check check (
    source in ('ai_suggested', 'ai_autonomous')
  ),
  constraint simulation_agent_daily_usage_notional_used_check check (notional_used >= 0),
  constraint simulation_agent_daily_usage_order_count_check check (order_count >= 0)
);

create unique index if not exists ux_sim_agent_daily_usage_scope
  on app.simulation_agent_daily_usage(
    user_id,
    usage_date,
    strategy_tag,
    source,
    coalesce(session_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(lane_id, '__all__')
  );

create index if not exists idx_sim_agent_daily_usage_user_date
  on app.simulation_agent_daily_usage(user_id, usage_date desc);
create index if not exists idx_sim_agent_daily_usage_session_date
  on app.simulation_agent_daily_usage(session_id, usage_date desc);
