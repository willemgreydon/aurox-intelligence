create table if not exists app.market_assets (
  asset_id text primary key,
  symbol text not null unique,
  name text not null,
  asset_class text not null,
  category text not null,
  geography text,
  sector text,
  thesis text not null,
  risk_summary text not null,
  action_availability text not null default 'planned',
  is_simulated boolean not null default false,
  is_tradable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_assets_asset_class_check check (asset_class in ('stock', 'etf', 'crypto', 'fx', 'index')),
  constraint market_assets_action_availability_check check (action_availability in ('available', 'simulated', 'planned', 'unavailable'))
);

create table if not exists app.market_quote_snapshots (
  symbol text primary key,
  asset_id text,
  price numeric(18, 8),
  change_amount numeric(18, 8),
  change_percent numeric(18, 8),
  source text not null,
  observed_at timestamptz,
  fetched_at timestamptz not null default now()
);

create table if not exists app.market_daily_bars (
  symbol text not null,
  observed_on date not null,
  open numeric(18, 8) not null,
  high numeric(18, 8) not null,
  low numeric(18, 8) not null,
  close numeric(18, 8) not null,
  volume numeric(20, 2),
  source text not null,
  fetched_at timestamptz not null default now(),
  primary key (symbol, observed_on)
);

create index if not exists idx_market_assets_asset_class on app.market_assets(asset_class);
create index if not exists idx_market_assets_tradable on app.market_assets(asset_class, is_tradable);
create index if not exists idx_market_quote_snapshots_observed_at on app.market_quote_snapshots(observed_at desc);
create index if not exists idx_market_daily_bars_symbol_observed_on on app.market_daily_bars(symbol, observed_on desc);

insert into app.market_assets (
  asset_id,
  symbol,
  name,
  asset_class,
  category,
  geography,
  sector,
  thesis,
  risk_summary,
  action_availability,
  is_simulated,
  is_tradable
) values
  ('stock-aapl', 'AAPL', 'Apple', 'stock', 'Mega-cap growth', 'United States', 'Technology', 'Large-cap quality compounder with ecosystem durability and cash generation.', 'Consumer device cycle sensitivity and multiple compression risk.', 'simulated', true, true),
  ('stock-msft', 'MSFT', 'Microsoft', 'stock', 'Platform compounder', 'United States', 'Technology', 'Cloud and enterprise exposure with resilient recurring revenue.', 'AI capex expectations and regulatory scrutiny can widen valuation swings.', 'simulated', true, true),
  ('stock-nvda', 'NVDA', 'NVIDIA', 'stock', 'AI infrastructure', 'United States', 'Semiconductors', 'High-beta AI infrastructure exposure with strong earnings sensitivity.', 'Crowded positioning and hardware cycle volatility can drive sharp drawdowns.', 'simulated', true, true),
  ('stock-amzn', 'AMZN', 'Amazon', 'stock', 'Platform retail and cloud', 'United States', 'Consumer discretionary', 'Scale retail logistics and cloud economics support durable free cash flow expansion.', 'Consumer slowdown and cloud margin pressure can challenge execution expectations.', 'simulated', true, true),
  ('stock-googl', 'GOOGL', 'Alphabet', 'stock', 'Digital advertising and AI', 'United States', 'Communication services', 'Search cash generation and AI distribution advantages support resilient profitability.', 'Regulatory remedies and ad-cycle sensitivity remain the main valuation risks.', 'simulated', true, true),
  ('stock-meta', 'META', 'Meta Platforms', 'stock', 'Consumer platform scale', 'United States', 'Communication services', 'High-margin ad monetization and platform engagement underpin earnings durability.', 'Regulation and elevated AI infrastructure spend can pressure the margin profile.', 'simulated', true, true),
  ('stock-tsla', 'TSLA', 'Tesla', 'stock', 'Electric mobility', 'United States', 'Consumer discretionary', 'Scale manufacturing and software optionality keep the name central in growth rotation.', 'Price competition and execution volatility can produce sharp multiple compression.', 'simulated', true, true),
  ('stock-avgo', 'AVGO', 'Broadcom', 'stock', 'Infrastructure semis', 'United States', 'Technology', 'Mission-critical semiconductor exposure and software cash generation support quality growth.', 'Integration risk and semiconductor cycle swings remain relevant downside drivers.', 'simulated', true, true),
  ('stock-amd', 'AMD', 'AMD', 'stock', 'Compute challenger', 'United States', 'Technology', 'Data-center and client share gains provide leveraged upside to AI and compute demand.', 'Competitive pressure and product-timing execution remain key swing factors.', 'simulated', true, true),
  ('stock-jpm', 'JPM', 'JPMorgan Chase', 'stock', 'Quality financials', 'United States', 'Financials', 'Diversified banking earnings and capital strength offer ballast across macro regimes.', 'Credit deterioration and regulatory capital changes can weigh on returns.', 'simulated', true, true),
  ('stock-lly', 'LLY', 'Eli Lilly', 'stock', 'Healthcare growth', 'United States', 'Healthcare', 'Therapeutics leadership and pipeline depth support long-duration earnings growth.', 'Valuation stretch and competitive drug launches remain meaningful risks.', 'simulated', true, true),
  ('etf-spy', 'SPY', 'SPDR S&P 500 ETF', 'etf', 'US broad market', 'United States', null, 'Core diversified beta for broad equity exposure and allocation planning.', 'Broad market drawdowns remain the primary risk driver.', 'planned', true, false),
  ('etf-qqq', 'QQQ', 'Invesco QQQ Trust', 'etf', 'Growth benchmark', 'United States', null, 'Concentrated growth and technology benchmark for tactical comparison.', 'Concentration in mega-cap tech increases factor crowding risk.', 'planned', true, false),
  ('etf-vti', 'VTI', 'Vanguard Total Stock Market ETF', 'etf', 'US total market', 'United States', null, 'Broad US equity allocation anchor with deep diversification across capitalization bands.', 'Macro equity drawdowns remain the primary portfolio risk.', 'planned', true, false),
  ('etf-iwm', 'IWM', 'iShares Russell 2000 ETF', 'etf', 'Small-cap beta', 'United States', null, 'Cyclical domestic exposure offers sensitivity to easing financial conditions and growth rotation.', 'Balance-sheet quality and financing stress can drive relative underperformance.', 'planned', true, false),
  ('etf-xlk', 'XLK', 'Technology Select Sector SPDR Fund', 'etf', 'Sector leadership', 'United States', null, 'Concentrated technology leadership vehicle for tactical sector expression.', 'Sector crowding amplifies drawdowns when leadership reverses.', 'planned', true, false),
  ('etf-gld', 'GLD', 'SPDR Gold Shares', 'etf', 'Defensive real asset', 'Global', null, 'Liquid precious-metals exposure for inflation and geopolitical hedge positioning.', 'Real-rate repricing can weaken defensive demand for bullion.', 'planned', true, false),
  ('etf-tlt', 'TLT', 'iShares 20+ Year Treasury Bond ETF', 'etf', 'Duration hedge', 'United States', null, 'Long-duration Treasury exposure provides macro hedging and rate-sensitivity expression.', 'Inflation persistence and supply pressure can challenge duration recovery.', 'planned', true, false),
  ('crypto-btcusd', 'BINANCE:BTCUSDT', 'Bitcoin', 'crypto', 'Digital reserve asset', null, null, 'High-liquidity crypto benchmark for macro-sensitive digital asset exposure.', 'Volatility, policy headlines, and weekend liquidity shifts remain material.', 'planned', true, false),
  ('crypto-ethusd', 'BINANCE:ETHUSDT', 'Ethereum', 'crypto', 'Smart contract platform', null, null, 'Programmable blockchain exposure with ecosystem and staking participation.', 'Execution roadmap risk and correlation to broader crypto beta remain elevated.', 'planned', true, false),
  ('crypto-solusd', 'BINANCE:SOLUSDT', 'Solana', 'crypto', 'High-beta smart contract platform', null, null, 'High-throughput ecosystem activity offers leveraged participation in crypto risk appetite.', 'Protocol instability, sentiment swings, and liquidity shocks remain elevated.', 'planned', true, false)
on conflict (asset_id) do update set
  symbol = excluded.symbol,
  name = excluded.name,
  asset_class = excluded.asset_class,
  category = excluded.category,
  geography = excluded.geography,
  sector = excluded.sector,
  thesis = excluded.thesis,
  risk_summary = excluded.risk_summary,
  action_availability = excluded.action_availability,
  is_simulated = excluded.is_simulated,
  is_tradable = excluded.is_tradable,
  updated_at = now();
