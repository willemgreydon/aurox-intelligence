-- Migration: 0019_admin_events_lifecycle_types
-- Purpose:  Extend the admin_events audit type constraint to cover account
--           lifecycle actions (status changes + forced session revocation), so
--           disable/reactivate/force-logout are audited to the same standard as
--           role changes.
-- Reversibility: EASY (constraint swap). Rollback:
--   alter table app.admin_events drop constraint if exists admin_events_event_type_check;
--   alter table app.admin_events add constraint admin_events_event_type_check
--     check (event_type in ('user_role_changed'));
-- Notes: additive value set; existing rows remain valid.
alter table app.admin_events drop constraint if exists admin_events_event_type_check;
alter table app.admin_events add constraint admin_events_event_type_check
  check (event_type in ('user_role_changed', 'user_status_changed', 'user_sessions_revoked'));
