-- Migration: 0027_signal_forecast_daily_unique
-- Purpose:   Add per-calendar-day uniqueness to signal_history and forecasts so
--            the daily cron is idempotent: re-running on the same day never creates
--            duplicate rows or errors. Uses a plain stored date column (IMMUTABLE in
--            a unique constraint) rather than a functional timestamptz index
--            (which Postgres marks STABLE/VOLATILE and rejects in unique indexes).
--
--            The new `generated_date date` column is populated by the application
--            layer (not a DB-side expression) to avoid timezone-dependency issues.
--
-- Reversibility: EASY — additive columns + indexes, no data loss.
-- Rollback:
--   drop index if exists uq_signal_history_asset_date;
--   drop index if exists uq_forecasts_asset_date;
--   alter table signal_history drop column if exists generated_date;
--   alter table forecasts drop column if exists generated_date;

-- ---- signal_history: add generated_date, backfill, constrain ----
alter table signal_history
  add column if not exists generated_date date;

-- Backfill from existing rows. Use AT TIME ZONE 'UTC' for a stable result
-- regardless of the session timezone setting.
update signal_history
set generated_date = (generated_at at time zone 'utc')::date
where generated_date is null;

-- Make it not-null for all future rows (existing rows just backfilled).
alter table signal_history
  alter column generated_date set default current_date;

-- Unique signal per asset per UTC calendar day.
create unique index if not exists uq_signal_history_asset_date
  on signal_history (asset_id, generated_date);

-- ---- forecasts: add generated_date, backfill, constrain ----
alter table forecasts
  add column if not exists generated_date date;

update forecasts
set generated_date = (generated_at at time zone 'utc')::date
where generated_date is null and generated_at is not null;

alter table forecasts
  alter column generated_date set default current_date;

-- Unique forecast per asset per UTC calendar day (only rows that have been
-- timestamped via the engine — old rows with null generated_at are excluded).
create unique index if not exists uq_forecasts_asset_date
  on forecasts (asset_id, generated_date)
  where generated_date is not null;
