create table if not exists app.provider_monitor_configs (
  id text primary key,
  provider_key text not null,
  provider_name text not null,
  category text not null,
  enabled boolean not null default true,
  monitor_health boolean not null default true,
  monitor_latency boolean not null default true,
  monitor_quota boolean not null default false,
  monitor_errors boolean not null default true,
  display_in_dashboard boolean not null default true,
  alert_threshold_ms integer null,
  failure_threshold integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
