-- Migration: 0017_admin_audit_events
-- Purpose:  Append-only audit trail for privileged admin actions (starting with
--           user role changes). Brings role mutations up to the same
--           auditability standard the simulation domain already holds — a
--           prerequisite before any live-trading capability is enabled.
-- Reversibility: EASY (additive). Rollback:
--   drop table if exists app.admin_events;
-- Notes:
--   * Immutable by convention: rows are only ever INSERTed, never updated or
--     deleted (no application code issues UPDATE/DELETE against this table).
--   * FKs use `on delete set null` (not cascade) so the audit record survives
--     even if an actor/target account is later removed.
create table if not exists app.admin_events (
  id uuid primary key,
  event_type text not null,
  actor_user_id uuid references app.users(id) on delete set null,
  actor_email text not null,
  target_user_id uuid references app.users(id) on delete set null,
  before_value text,
  after_value text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_events_event_type_check check (event_type in ('user_role_changed'))
);

create index if not exists admin_events_created_at_idx on app.admin_events (created_at desc);
create index if not exists admin_events_target_user_idx on app.admin_events (target_user_id);
