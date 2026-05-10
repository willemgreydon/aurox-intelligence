create index if not exists idx_market_quote_snapshots_source_fetched_at
  on app.market_quote_snapshots (source, fetched_at desc);

create index if not exists idx_market_quote_snapshots_observed_at
  on app.market_quote_snapshots (observed_at desc);

create index if not exists idx_market_daily_bars_symbol_source_observed_on
  on app.market_daily_bars (symbol, source, observed_on desc);

create index if not exists idx_market_daily_bars_fetched_at
  on app.market_daily_bars (fetched_at desc);

create index if not exists idx_observation_events_observed_at
  on app.observation_events (observed_at desc);

create index if not exists idx_observation_events_source_severity_observed_at
  on app.observation_events (source, severity, observed_at desc);

create index if not exists idx_alerts_source_severity_last_seen_at
  on app.alerts (source, severity, last_seen_at desc);

create index if not exists idx_alert_states_status_updated_at
  on app.alert_states (status, updated_at desc);
