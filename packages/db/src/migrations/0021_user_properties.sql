-- Migration: 0021_user_properties
-- Purpose:   Additive user-properties layer for internal data science, platform
--            maturity tracking, CSAT/NPS satisfaction signals, acquisition
--            attribution, simulation-behavior aggregates, and consent/marketing
--            flags. Lives in a dedicated 1:1 table (app.user_properties) so the
--            auth-critical app.users table is NOT touched. A user with no row is
--            represented in code by createDefaultUserProperties(); this migration
--            backfills nothing.
--
--            Group map (mirrors packages/api-contracts user-properties.ts):
--              A profile · B lifecycle · C engagement · D satisfaction
--              E acquisition · F behavior · G consent · H internal (admin-only)
--
-- Reversibility: EASY — a single additive table, no changes to existing tables,
--                no data loss on existing rows. Safe against populated databases.
-- Rollback:
--   drop table if exists app.user_properties;

create table if not exists app.user_properties (
  user_id uuid primary key references app.users(id) on delete cascade,

  -- A. Extended profile (user-editable)
  job_title text,
  organization text,
  country text,
  region text,
  timezone text,
  bio text,

  -- B. Lifecycle & maturity (system/admin)
  lifecycle_stage text,
  maturity_tier text,
  onboarding_completed_at timestamptz,
  first_simulation_at timestamptz,
  activated_at timestamptz,
  last_active_at timestamptz,

  -- C. Engagement aggregates (job-refreshed)
  total_sessions integer not null default 0,
  total_active_days integer not null default 0,
  streak_days integer not null default 0,
  total_simulation_orders integer not null default 0,
  feature_adoption jsonb not null default '{}'::jsonb,
  aggregates_refreshed_at timestamptz,

  -- D. CSAT / NPS (user-submitted)
  nps_score integer,
  nps_category text,
  nps_submitted_at timestamptz,
  csat_score integer,
  csat_submitted_at timestamptz,
  satisfaction_notes text,

  -- E. Acquisition / attribution (capture-once)
  acquisition_source text,
  acquisition_medium text,
  acquisition_campaign text,
  referral_code text,
  landing_page text,
  first_touch_at timestamptz,

  -- F. Simulation-behavior aggregates (system-derived)
  risk_appetite text,
  preferred_asset_scope text,
  most_traded_asset_class text,
  avg_position_size_usd numeric(18, 2),
  behavior_refreshed_at timestamptz,

  -- G. Consent / marketing (user-consent; privacy by default)
  marketing_opt_in boolean not null default false,
  product_updates_opt_in boolean not null default false,
  research_participation_opt_in boolean not null default false,
  terms_accepted_version text,
  terms_accepted_at timestamptz,
  privacy_policy_version text,
  consent_updated_at timestamptz,

  -- H. Internal data science / ops (ADMIN-ONLY — never in a user read model)
  health_score numeric(5, 2),
  churn_risk_score numeric(5, 4),
  internal_segments jsonb not null default '[]'::jsonb,
  admin_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_properties_lifecycle_stage_check check (
    lifecycle_stage is null or lifecycle_stage in (
      'signed_up', 'onboarding', 'activated', 'engaged',
      'power_user', 'at_risk', 'churned', 'reactivated'
    )
  ),
  constraint user_properties_maturity_tier_check check (
    maturity_tier is null or maturity_tier in ('observer', 'simulator', 'strategist', 'operator')
  ),
  constraint user_properties_nps_score_range check (nps_score is null or (nps_score >= 0 and nps_score <= 10)),
  constraint user_properties_nps_category_check check (
    nps_category is null or nps_category in ('detractor', 'passive', 'promoter')
  ),
  constraint user_properties_csat_score_range check (csat_score is null or (csat_score >= 1 and csat_score <= 5)),
  constraint user_properties_risk_appetite_check check (
    risk_appetite is null or risk_appetite in ('conservative', 'balanced', 'aggressive')
  ),
  constraint user_properties_preferred_asset_scope_check check (
    preferred_asset_scope is null or preferred_asset_scope in ('stock', 'etf', 'crypto', 'multi-asset')
  ),
  constraint user_properties_most_traded_asset_class_check check (
    most_traded_asset_class is null or most_traded_asset_class in ('stock', 'etf', 'crypto')
  ),
  constraint user_properties_health_score_range check (health_score is null or (health_score >= 0 and health_score <= 100)),
  constraint user_properties_churn_risk_range check (churn_risk_score is null or (churn_risk_score >= 0 and churn_risk_score <= 1))
);

-- Segmentation indexes for internal data-science queries.
create index if not exists idx_user_properties_lifecycle_stage
  on app.user_properties(lifecycle_stage);
create index if not exists idx_user_properties_maturity_tier
  on app.user_properties(maturity_tier);
create index if not exists idx_user_properties_churn_risk
  on app.user_properties(churn_risk_score desc)
  where churn_risk_score is not null;
