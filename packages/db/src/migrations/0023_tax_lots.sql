-- Migration: 0023_tax_lots
-- Purpose:   Persist acquisition tax lots for the Investment Services tax engine
--            (contract: packages/api-contracts investment-services/tax.ts). Lots
--            are matched against disposals (FIFO/policy-driven, in the pure
--            engine) to produce realised gains; `remaining_quantity` tracks how
--            much of each lot is still open.
--
--            Money is stored as INTEGER minor units (bigint) plus a shared
--            currency/scale — never a float — so it round-trips to the
--            decimal-safe Money contract exactly. Quantities are numeric(18,8).
--            Date fields are ISO text to match the string contract.
--
-- Reversibility: EASY — a single additive table, no changes to existing tables.
-- Rollback:
--   drop table if exists app.tax_lots;

create table if not exists app.tax_lots (
  lot_id uuid primary key default gen_random_uuid(),
  investor_ref uuid not null references app.users(id) on delete cascade,
  instrument_symbol text not null,
  jurisdiction text not null,
  tax_asset_class text not null,
  acquisition_date text not null,
  acquisition_quantity numeric(18, 8) not null,
  acquisition_unit_price_minor bigint not null,
  acquisition_costs_minor bigint not null default 0,
  currency text not null,
  scale integer not null default 2,
  remaining_quantity numeric(18, 8) not null,
  fx_provenance jsonb,
  broker text,
  created_at timestamptz not null default now()
);

-- Open-lot lookups per investor + instrument (oldest-first for FIFO) are the hot path.
create index if not exists tax_lots_investor_symbol_idx
  on app.tax_lots (investor_ref, instrument_symbol, acquisition_date);
