-- Migration: 0025_intelligence_evaluation_layer
-- Purpose:   Close the final arrows of the Aurox evidence chain — "what did the
--            system forecast / signal, and how accurate was it afterwards?" —
--            which previously had no persistence anywhere in the schema.
--
--            Adds, all additively:
--              1. Ingestion-run auditability columns (provenance/observability)
--                 on the existing (minimal) public.ingestion_runs ledger.
--              2. A canonical instrument master (app.instruments) + provider
--                 symbol map (app.instrument_provider_map), so instrument identity
--                 stops being "the ticker string". Downstream symbol-keyed reads
--                 are untouched — this is purely additive canonical identity.
--              3. app.signal_outcomes — a matured-signal evaluation ledger
--                 (forward return, direction correctness, MFE/MAE) measured from
--                 the realized price path in app.market_daily_bars.
--              4. app.forecast_evaluations — a matured-forecast evaluation ledger
--                 (directional accuracy + Brier score vs scenario weights).
--              5. app.signal_calibration / app.forecast_calibration views —
--                 confidence-bucket × direction reliability, computed on demand.
--              6. Nullable ingestion_run_id provenance links on market_daily_bars,
--                 signal_history, forecasts so evidence can be traced to its run.
--
--            Point-in-time safety is enforced by the WRITER (the backfill /
--            recompute path), not the schema: outcomes store the signal's own
--            generated_at and only reference realized prices strictly AFTER it.
--            Evaluation rows are immutable and append-only; a matured signal's
--            original row in signal_history is never rewritten to agree with the
--            outcome.
--
-- Reversibility: EASY — new tables/views + nullable columns only. No existing
--                row is modified; safe against populated databases.
-- Rollback:
--   drop view if exists app.forecast_calibration;
--   drop view if exists app.signal_calibration;
--   drop table if exists app.forecast_evaluations;
--   drop table if exists app.signal_outcomes;
--   drop table if exists app.instrument_provider_map;
--   drop table if exists app.instruments;
--   alter table app.market_daily_bars drop column if exists ingestion_run_id;
--   alter table public.signal_history drop column if exists ingestion_run_id;
--   alter table public.forecasts drop column if exists ingestion_run_id;
--   alter table public.ingestion_runs
--     drop column if exists provider, drop column if exists dataset,
--     drop column if exists asset_scope, drop column if exists requested_range_start,
--     drop column if exists requested_range_end, drop column if exists bar_interval,
--     drop column if exists rows_requested, drop column if exists rows_received,
--     drop column if exists rows_inserted, drop column if exists rows_updated,
--     drop column if exists rows_rejected, drop column if exists duplicates,
--     drop column if exists retries, drop column if exists error,
--     drop column if exists code_version, drop column if exists fingerprint;

-- ---------------------------------------------------------------------------
-- 1. Ingestion-run auditability (additive on existing public.ingestion_runs)
-- ---------------------------------------------------------------------------
alter table public.ingestion_runs add column if not exists provider text;
alter table public.ingestion_runs add column if not exists dataset text;
alter table public.ingestion_runs add column if not exists asset_scope jsonb;
alter table public.ingestion_runs add column if not exists requested_range_start timestamptz;
alter table public.ingestion_runs add column if not exists requested_range_end timestamptz;
alter table public.ingestion_runs add column if not exists bar_interval text;
alter table public.ingestion_runs add column if not exists rows_requested integer;
alter table public.ingestion_runs add column if not exists rows_received integer;
alter table public.ingestion_runs add column if not exists rows_inserted integer;
alter table public.ingestion_runs add column if not exists rows_updated integer;
alter table public.ingestion_runs add column if not exists rows_rejected integer;
alter table public.ingestion_runs add column if not exists duplicates integer;
alter table public.ingestion_runs add column if not exists retries integer;
alter table public.ingestion_runs add column if not exists error text;
alter table public.ingestion_runs add column if not exists code_version text;
alter table public.ingestion_runs add column if not exists fingerprint text;

-- ---------------------------------------------------------------------------
-- 2. Canonical instrument master (additive; does not replace symbol-keyed reads)
-- ---------------------------------------------------------------------------
create table if not exists app.instruments (
  instrument_id uuid primary key default gen_random_uuid(),
  canonical_symbol text not null unique,
  display_name text not null,
  asset_class text not null,
  subtype text,
  exchange text,
  base_currency text,
  quote_currency text,
  isin text,
  chain text,
  status text not null default 'active',
  tick_size numeric(18, 8),
  step_size numeric(18, 8),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instruments_asset_class_check
    check (asset_class in ('stock', 'etf', 'crypto', 'fx', 'index', 'commodity')),
  constraint instruments_status_check
    check (status in ('active', 'inactive', 'delisted'))
);

create table if not exists app.instrument_provider_map (
  instrument_id uuid not null references app.instruments(instrument_id) on delete cascade,
  provider text not null,
  provider_symbol text not null,
  created_at timestamptz not null default now(),
  primary key (provider, provider_symbol)
);
create index if not exists idx_instrument_provider_map_instrument
  on app.instrument_provider_map(instrument_id);

-- ---------------------------------------------------------------------------
-- 3. Signal outcome evaluation (append-only, immutable)
--    One row per (signal, horizon). forward_return measured from the realized
--    close at generated_at to the close `horizon_days` trading sessions later.
-- ---------------------------------------------------------------------------
create table if not exists app.signal_outcomes (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null,
  asset_id text not null,
  symbol text not null,
  signal_generated_at timestamptz not null,
  horizon_days integer not null,
  evaluated_at timestamptz not null,
  entry_price numeric(18, 8) not null,
  exit_price numeric(18, 8) not null,
  forward_return numeric(12, 8) not null,
  mfe numeric(12, 8),
  mae numeric(12, 8),
  predicted_direction text not null,
  realized_direction text not null,
  direction_correct boolean not null,
  signal_score numeric(6, 4) not null,
  signal_confidence numeric(5, 4) not null,
  method_version text not null,
  ingestion_run_id uuid,
  created_at timestamptz not null default now(),
  constraint signal_outcomes_predicted_dir_check
    check (predicted_direction in ('bullish', 'bearish', 'neutral')),
  constraint signal_outcomes_realized_dir_check
    check (realized_direction in ('bullish', 'bearish', 'neutral')),
  constraint signal_outcomes_unique unique (signal_id, horizon_days)
);
create index if not exists idx_signal_outcomes_asset
  on app.signal_outcomes(asset_id, signal_generated_at desc);
create index if not exists idx_signal_outcomes_confidence
  on app.signal_outcomes(signal_confidence);

-- ---------------------------------------------------------------------------
-- 4. Forecast evaluation (append-only, immutable)
--    status: pending (not yet matured) | matured (horizon reached, not scored)
--          | evaluated (scored) | insufficient_data (no realized price)
-- ---------------------------------------------------------------------------
create table if not exists app.forecast_evaluations (
  id uuid primary key default gen_random_uuid(),
  forecast_id uuid not null,
  asset_id text not null,
  symbol text,
  produced_at timestamptz not null,
  horizon text not null,
  horizon_days integer not null,
  evaluated_at timestamptz not null,
  reference_price numeric(18, 8) not null,
  realized_price numeric(18, 8) not null,
  forward_return numeric(12, 8) not null,
  directional_bias text not null,
  realized_direction text not null,
  direction_correct boolean not null,
  brier_score numeric(8, 6),
  scenario_weights jsonb not null,
  confidence_score numeric(5, 4) not null,
  status text not null default 'evaluated',
  method_version text not null,
  ingestion_run_id uuid,
  created_at timestamptz not null default now(),
  constraint forecast_eval_bias_check
    check (directional_bias in ('bullish', 'bearish', 'neutral')),
  constraint forecast_eval_realized_dir_check
    check (realized_direction in ('bullish', 'bearish', 'neutral')),
  constraint forecast_eval_status_check
    check (status in ('pending', 'matured', 'evaluated', 'insufficient_data')),
  constraint forecast_eval_unique unique (forecast_id, horizon_days)
);
create index if not exists idx_forecast_eval_asset
  on app.forecast_evaluations(asset_id, produced_at desc);

-- ---------------------------------------------------------------------------
-- 5. Calibration views — confidence reliability, computed on demand (no storage)
--    confidence_bucket: 1..10 via width_bucket over [0,1].
-- ---------------------------------------------------------------------------
create or replace view app.signal_calibration as
select
  width_bucket(signal_confidence, 0, 1, 10) as confidence_bucket,
  predicted_direction,
  count(*)::int as sample_size,
  avg(case when direction_correct then 1.0 else 0.0 end)::numeric(6, 4) as hit_rate,
  avg(forward_return)::numeric(12, 8) as avg_forward_return,
  avg(signal_confidence)::numeric(5, 4) as avg_confidence
from app.signal_outcomes
group by 1, 2;

create or replace view app.forecast_calibration as
select
  width_bucket(confidence_score, 0, 1, 10) as confidence_bucket,
  directional_bias,
  count(*)::int as sample_size,
  avg(case when direction_correct then 1.0 else 0.0 end)::numeric(6, 4) as hit_rate,
  avg(brier_score)::numeric(8, 6) as avg_brier,
  avg(forward_return)::numeric(12, 8) as avg_forward_return,
  avg(confidence_score)::numeric(5, 4) as avg_confidence
from app.forecast_evaluations
group by 1, 2;

-- ---------------------------------------------------------------------------
-- 6. Provenance links (additive, nullable) — evidence → ingestion run
-- ---------------------------------------------------------------------------
alter table app.market_daily_bars add column if not exists ingestion_run_id uuid;
alter table public.signal_history add column if not exists ingestion_run_id uuid;
alter table public.forecasts add column if not exists ingestion_run_id uuid;
