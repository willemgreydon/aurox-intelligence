create table if not exists app.user_dashboard_presets (
  user_id uuid primary key references app.users(id) on delete cascade,
  locale text not null default 'en',
  default_chart_type text not null default 'trend',
  default_time_period text not null default '1mo',
  tracked_symbols jsonb not null default '[]'::jsonb,
  visible_modules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_dashboard_presets_locale_check check (locale in ('en', 'de', 'fr')),
  constraint user_dashboard_presets_chart_type_check check (
    default_chart_type in ('bar', 'donut', 'comparison', 'trend', 'stock')
  ),
  constraint user_dashboard_presets_time_period_check check (
    default_time_period in ('1s', '3s', '5s', '10s', '1m', '1h', '1d', '1w', '1mo', '1y', '2y', '5y')
  )
);

create table if not exists app.user_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  asset_id text not null,
  symbol text not null,
  asset_class text not null,
  added_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_watchlist_items_asset_class_check check (asset_class in ('stock', 'etf', 'crypto', 'fx')),
  unique (user_id, asset_id)
);

create table if not exists market_intelligence_insights (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null,
  symbol text not null,
  headline text not null,
  summary text not null,
  stance text not null,
  confidence_score numeric(5, 4) not null,
  what_changed text not null,
  factors jsonb not null default '[]'::jsonb,
  risk_flags jsonb not null default '[]'::jsonb,
  provenance jsonb not null,
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_intelligence_insights_stance_check check (stance in ('positive', 'negative', 'neutral'))
);

create index if not exists idx_user_watchlist_items_user_id on app.user_watchlist_items(user_id, added_at desc);
create index if not exists idx_market_intelligence_symbol_generated_at on market_intelligence_insights(symbol, generated_at desc);
create index if not exists idx_market_intelligence_asset_generated_at on market_intelligence_insights(asset_id, generated_at desc);
