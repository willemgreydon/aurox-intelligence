-- Migration: 0024_widen_dashboard_preset_locale_check
-- Purpose:   The user_dashboard_presets.locale CHECK constraint (added in 0004)
--            only allowed ('en','de','fr'), but the app ships 12 locales
--            (localeSchema in packages/api-contracts workspace/preferences.ts:
--            en, de, fr, es, it, pt, nl, zh, ja, ko, ar, hi). Users on any of the
--            other 9 locales hit Postgres error 23514
--            (user_dashboard_presets_locale_check) when persisting preferences;
--            the write silently fell back to a cookie-only locale. This widens
--            the constraint to the full supported set so preference persistence
--            works for every locale.
--
-- Rollback:
--   alter table app.user_dashboard_presets drop constraint if exists user_dashboard_presets_locale_check;
--   alter table app.user_dashboard_presets add constraint user_dashboard_presets_locale_check
--     check (locale in ('en', 'de', 'fr'));
-- Reversibility: EASY — constraint-only change, no data migration. Existing rows
--   only ever contain en/de/fr (wider writes were rejected), so every current
--   row already satisfies the widened constraint; the swap cannot fail on data.

alter table app.user_dashboard_presets
  drop constraint if exists user_dashboard_presets_locale_check;

alter table app.user_dashboard_presets
  add constraint user_dashboard_presets_locale_check
  check (locale in ('en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'zh', 'ja', 'ko', 'ar', 'hi'));
