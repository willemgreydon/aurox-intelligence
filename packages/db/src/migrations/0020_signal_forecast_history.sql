-- Migration: 0020_signal_forecast_history
-- Purpose:   Persist deterministic signal snapshots over time, and enrich the
--            existing (currently write-unwired) `forecasts` table so a later
--            "forecast vs reality" comparison can join a forecast to the actual
--            price path recorded in market_daily_bars.
--
--            This is INFRASTRUCTURE for empirical validation surfaces (signal
--            accuracy / pattern expectancy / forecast-vs-reality). It backfills
--            nothing: there is no pre-existing signal/forecast history to import,
--            so those surfaces remain honestly "insufficient history" until rows
--            accumulate going forward.
--
-- Reversibility: EASY — additive table + nullable columns only. No data loss on
--                existing rows. Safe to run against populated databases.
-- Rollback:
--   drop table if exists signal_history;
--   alter table forecasts drop column if exists symbol;
--   alter table forecasts drop column if exists reference_price;
--   alter table forecasts drop column if exists generated_at;

-- Signal snapshot history: one row per (asset, generation). Append-only; the
-- deterministic signal engine's output captured at a point in time so forward
-- returns can later be attributed to what the signal actually said.
create table if not exists signal_history (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null,
  symbol text not null,
  asset_class text,
  interpretation text not null,
  composite_score numeric(6, 4) not null,
  confidence numeric(5, 4) not null,
  latest_price numeric(18, 8),
  -- Injected by the engine (never a DB clock) — the instant the signal describes.
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint signal_history_interpretation_check
    check (interpretation in ('bullish', 'bearish', 'neutral')),
  constraint signal_history_composite_range check (composite_score >= -1 and composite_score <= 1),
  constraint signal_history_confidence_range check (confidence >= 0 and confidence <= 1)
);

create index if not exists idx_signal_history_asset_generated_at
  on signal_history(asset_id, generated_at desc);
create index if not exists idx_signal_history_symbol_generated_at
  on signal_history(symbol, generated_at desc);

-- Enrich forecasts so a stored forecast can be evaluated against reality:
--   symbol         → join key to market_daily_bars for the realized path
--   reference_price → price at production time (the anchor return is measured from)
--   generated_at    → engine-injected timestamp (produced_at already exists but
--                     defaults to now(); keep an explicit engine timestamp too)
alter table forecasts add column if not exists symbol text;
alter table forecasts add column if not exists reference_price numeric(18, 8);
alter table forecasts add column if not exists generated_at timestamptz;
