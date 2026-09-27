-- Migration: 0022_investor_profiles
-- Purpose:   Append-only, VERSIONED investor profiles for the Investment Services
--            Intelligence domain (contracts in packages/api-contracts
--            investment-services/investor.ts). A new profile version is a new
--            row; historical versions are never mutated, so a suitability /
--            appropriateness / tax decision made against version N stays
--            reproducible after the client updates to N+1.
--
--            Lives in its own table (app.investor_profiles), 1:many with a user
--            via investor_ref → app.users(id). Money-free; risk tolerance and
--            loss-bearing capacity are modelled as independent columns.
--            Date/timestamp domain fields are stored as ISO text to match the
--            string contract exactly (no tz reformatting on read).
--
-- Reversibility: EASY — a single additive table, no changes to existing tables,
--                no data loss on existing rows. Safe against populated databases.
-- Rollback:
--   drop table if exists app.investor_profiles;

create table if not exists app.investor_profiles (
  profile_id uuid primary key default gen_random_uuid(),
  investor_ref uuid not null references app.users(id) on delete cascade,
  version integer not null,

  effective_date text not null,
  last_reviewed_at text,

  client_category text not null,
  broker_classification text,
  tax_residency text,
  base_currency text not null,

  financial_situation jsonb not null default '{}'::jsonb,
  objective text,
  strategy text,
  horizon text,
  risk_tolerance text,
  loss_bearing_capacity text,
  knowledge text,
  experience text,
  instrument_experience jsonb not null default '{}'::jsonb,
  sustainability_preferences jsonb,
  completeness numeric(4, 3) not null default 0,
  provenance jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),

  unique (investor_ref, version)
);

-- Latest-version lookups per investor are the hot path.
create index if not exists investor_profiles_ref_version_desc_idx
  on app.investor_profiles (investor_ref, version desc);
