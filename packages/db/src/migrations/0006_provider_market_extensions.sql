create table if not exists app.market_asset_profiles (
  symbol text primary key,
  asset_id text,
  asset_class text not null,
  name text not null,
  exchange text,
  currency text,
  description text,
  sector text,
  industry text,
  country text,
  website_url text,
  logo_url text,
  market_cap numeric(22, 2),
  source text not null,
  updated_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  constraint market_asset_profiles_asset_class_check check (asset_class in ('stock', 'etf', 'crypto'))
);

create table if not exists app.crypto_global_metrics (
  observed_at timestamptz primary key,
  active_cryptocurrencies integer,
  markets integer,
  total_market_cap_usd numeric(24, 2),
  total_volume_24h_usd numeric(24, 2),
  bitcoin_dominance_percent numeric(12, 4),
  ethereum_dominance_percent numeric(12, 4),
  market_cap_change_24h_percent numeric(12, 4),
  source text not null,
  fetched_at timestamptz not null default now()
);

create index if not exists idx_market_asset_profiles_fetched_at on app.market_asset_profiles(fetched_at desc);
create index if not exists idx_crypto_global_metrics_observed_at on app.crypto_global_metrics(observed_at desc);
