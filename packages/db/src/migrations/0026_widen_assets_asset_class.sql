-- Migration: 0026_widen_assets_asset_class
-- Purpose:   public.assets.asset_class carried a stale narrow check from 0002
--            (only 'stock' | 'fx'). Because public.forecasts.asset_id has a FK to
--            public.assets(id), and forecast-repository swallows FK violations
--            (23503) as a no-op, forecasts for ETF/crypto/index instruments could
--            NEVER be persisted — they silently vanished. Widen the check to match
--            app.market_assets so the curated universe (stock/etf/crypto/fx/index)
--            can all carry persisted forecasts and forecast evaluations.
--
-- Reversibility: EASY — loosening a CHECK is backward compatible; existing rows
--                remain valid. Rollback narrows it again (only safe if no rows use
--                the newly-allowed classes).
-- Rollback:
--   alter table public.assets drop constraint if exists assets_asset_class_check;
--   alter table public.assets add constraint assets_asset_class_check
--     check (asset_class = any (array['stock','fx']));

alter table public.assets drop constraint if exists assets_asset_class_check;
alter table public.assets add constraint assets_asset_class_check
  check (asset_class = any (array['stock', 'etf', 'crypto', 'fx', 'index', 'commodity']));
