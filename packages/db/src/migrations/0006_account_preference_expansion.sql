alter table if exists app.user_dashboard_presets
  add column if not exists simulation_preferences jsonb not null default '{}'::jsonb,
  add column if not exists activity_preferences jsonb not null default '{}'::jsonb;

update app.user_dashboard_presets
set
  simulation_preferences = jsonb_build_object(
    'preferredBrokerMode', 'manual_stock_lane',
    'brokerModeCapitalLimitUsd', 50000,
    'microTradeAllocationPercent', 8,
    'defaultAssetScope', 'stock'
  ),
  activity_preferences = jsonb_build_object(
    'orderActivityDigest', true,
    'laneStatusAlerts', true
  )
where simulation_preferences = '{}'::jsonb
   or activity_preferences = '{}'::jsonb;
