alter table app.simulation_agent_decisions
  add column if not exists account_id uuid,
  add column if not exists portfolio_id uuid,
  add column if not exists mode text,
  add column if not exists action text,
  add column if not exists symbol text,
  add column if not exists asset_class text,
  add column if not exists confidence numeric,
  add column if not exists ranked_snapshot_hash text,
  add column if not exists decision_json jsonb,
  add column if not exists rejected_reason text;

update app.simulation_agent_decisions
set
  mode = coalesce(mode, autonomy_mode),
  action = coalesce(action, decision_action),
  decision_json = coalesce(decision_json, decision_payload),
  rejected_reason = coalesce(rejected_reason, cap_check_reason)
where mode is null
   or action is null
   or decision_json is null
   or rejected_reason is null;

alter table app.simulation_agent_decisions
  alter column mode set default 'suggest_only',
  alter column action set default 'HOLD',
  alter column decision_json set default '{}'::jsonb;

update app.simulation_agent_decisions
set
  mode = coalesce(mode, 'suggest_only'),
  action = coalesce(action, 'HOLD'),
  decision_json = coalesce(decision_json, '{}'::jsonb)
where mode is null
   or action is null
   or decision_json is null;

alter table app.simulation_agent_decisions
  alter column mode set not null,
  alter column action set not null,
  alter column decision_json set not null;

create index if not exists idx_sim_agent_decisions_user_created_at
  on app.simulation_agent_decisions(user_id, created_at desc);
create index if not exists idx_sim_agent_decisions_user_lane_created_at
  on app.simulation_agent_decisions(user_id, lane_id, created_at desc);

alter table app.simulation_agent_order_links
  add column if not exists simulation_order_id uuid,
  add column if not exists user_id text,
  add column if not exists account_id uuid,
  add column if not exists portfolio_id uuid,
  add column if not exists session_id uuid,
  add column if not exists lane_id text,
  add column if not exists notional numeric not null default 0;

update app.simulation_agent_order_links links
set
  simulation_order_id = coalesce(links.simulation_order_id, links.order_id),
  user_id = coalesce(links.user_id, decisions.user_id::text),
  account_id = coalesce(links.account_id, orders.account_id),
  portfolio_id = coalesce(links.portfolio_id, orders.portfolio_id),
  session_id = coalesce(links.session_id, decisions.session_id),
  lane_id = coalesce(links.lane_id, decisions.lane_id),
  notional = case
    when links.notional is null or links.notional = 0 then coalesce(orders.gross_amount, 0)
    else links.notional
  end
from app.simulation_agent_decisions decisions,
     app.simulation_orders orders
where links.decision_id = decisions.id
  and orders.id = coalesce(links.simulation_order_id, links.order_id);

update app.simulation_agent_order_links
set user_id = '__missing__'
where user_id is null;

alter table app.simulation_agent_order_links
  alter column simulation_order_id set not null,
  alter column user_id set not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'app'
      and table_name = 'simulation_agent_order_links'
      and column_name = 'order_id'
  ) then
    execute '
      create unique index if not exists simulation_agent_order_links_decision_simulation_order_unique
      on app.simulation_agent_order_links(decision_id, coalesce(simulation_order_id, order_id))
    ';
  else
    execute '
      create unique index if not exists simulation_agent_order_links_decision_simulation_order_unique
      on app.simulation_agent_order_links(decision_id, simulation_order_id)
    ';
  end if;
end $$;

create index if not exists idx_sim_agent_order_links_user_created_at
  on app.simulation_agent_order_links(user_id, created_at desc);
create index if not exists idx_sim_agent_order_links_user_lane_created_at
  on app.simulation_agent_order_links(user_id, lane_id, created_at desc);
