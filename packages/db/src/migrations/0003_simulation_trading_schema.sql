create table if not exists app.simulation_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app.users(id) on delete cascade,
  base_currency text not null default 'USD',
  initial_cash_balance numeric(18, 2) not null default 100000,
  cash_balance numeric(18, 2) not null default 100000,
  realized_pnl numeric(18, 2) not null default 0,
  allow_negative_balance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulation_accounts_currency_check check (base_currency in ('USD'))
);

create table if not exists app.simulation_portfolios (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references app.simulation_accounts(id) on delete cascade,
  name text not null default 'Primary simulation portfolio',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.simulation_positions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references app.simulation_portfolios(id) on delete cascade,
  asset_id text not null,
  symbol text not null,
  asset_class text not null,
  quantity numeric(18, 8) not null default 0,
  average_cost numeric(18, 8) not null default 0,
  realized_pnl numeric(18, 2) not null default 0,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulation_positions_asset_class_check check (asset_class in ('stock', 'etf', 'crypto')),
  unique (portfolio_id, asset_id)
);

create table if not exists app.simulation_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.simulation_accounts(id) on delete cascade,
  portfolio_id uuid not null references app.simulation_portfolios(id) on delete cascade,
  asset_id text not null,
  symbol text not null,
  asset_class text not null,
  side text not null,
  status text not null,
  order_type text not null default 'market',
  quantity numeric(18, 8) not null,
  requested_price numeric(18, 8) not null,
  executed_price numeric(18, 8) not null,
  gross_amount numeric(18, 2) not null,
  cash_effect numeric(18, 2) not null,
  realized_pnl numeric(18, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  executed_at timestamptz not null default now(),
  constraint simulation_orders_asset_class_check check (asset_class in ('stock', 'etf', 'crypto')),
  constraint simulation_orders_side_check check (side in ('buy', 'sell')),
  constraint simulation_orders_status_check check (status in ('filled', 'rejected', 'cancelled')),
  constraint simulation_orders_type_check check (order_type in ('market'))
);

create table if not exists app.simulation_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.simulation_accounts(id) on delete cascade,
  portfolio_id uuid not null references app.simulation_portfolios(id) on delete cascade,
  order_id uuid references app.simulation_orders(id) on delete set null,
  position_id uuid references app.simulation_positions(id) on delete set null,
  transaction_type text not null,
  asset_id text,
  symbol text,
  asset_class text,
  quantity numeric(18, 8),
  price numeric(18, 8),
  gross_amount numeric(18, 2) not null default 0,
  fee_amount numeric(18, 2) not null default 0,
  cash_delta numeric(18, 2) not null,
  realized_pnl numeric(18, 2) not null default 0,
  description text not null,
  created_at timestamptz not null default now(),
  constraint simulation_transactions_type_check check (transaction_type in ('initial_funding', 'buy', 'sell', 'reset')),
  constraint simulation_transactions_asset_class_check check (asset_class is null or asset_class in ('stock', 'etf', 'crypto'))
);

create table if not exists app.simulation_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.simulation_accounts(id) on delete cascade,
  portfolio_id uuid not null references app.simulation_portfolios(id) on delete cascade,
  cash_balance numeric(18, 2) not null,
  market_value numeric(18, 2) not null,
  equity_value numeric(18, 2) not null,
  unrealized_pnl numeric(18, 2) not null,
  realized_pnl numeric(18, 2) not null,
  position_count integer not null,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_simulation_accounts_user_id on app.simulation_accounts(user_id);
create index if not exists idx_simulation_positions_portfolio_id on app.simulation_positions(portfolio_id);
create index if not exists idx_simulation_positions_symbol on app.simulation_positions(symbol);
create index if not exists idx_simulation_orders_account_created_at on app.simulation_orders(account_id, created_at desc);
create index if not exists idx_simulation_transactions_account_created_at on app.simulation_transactions(account_id, created_at desc);
create index if not exists idx_simulation_snapshots_account_taken_at on app.simulation_snapshots(account_id, taken_at desc);
