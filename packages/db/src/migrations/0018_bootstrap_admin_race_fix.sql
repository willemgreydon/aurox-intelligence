-- Migration: 0018_bootstrap_admin_race_fix
-- Purpose:  Close the registration-order race in 0016_seed_bootstrap_admin.
--           0016 is a one-shot `UPDATE ... WHERE email = ...` that the migration
--           runner records as applied even when it affects ZERO rows. If 0016
--           ran before the bootstrap operator registered, that account was never
--           promoted and 0016 will never run again (it is marked applied
--           forever). This migration makes the bootstrap promotion deterministic
--           regardless of whether registration happened before or after
--           migration time:
--             (1) a BEFORE INSERT trigger promotes the bootstrap email at the
--                 moment the account is created (covers "registers later"), and
--             (2) an immediate UPDATE promotes the account if it already exists
--                 as a non-admin (covers "registered between 0016 and now").
--
-- Safety properties:
--   * Deterministic + race-proof: promotion no longer depends on migration/
--     registration ordering.
--   * Does NOT create an account or password (only promotes an existing/new row).
--   * Does NOT promote arbitrary users (single, case-insensitive email match).
--   * Promote-only: the trigger never demotes and only fires on INSERT, so normal
--     role management (and anti-self-demotion) is unaffected after bootstrap.
--   * Additive, no schema change to existing columns.
--
-- Reversibility: EASY. Rollback:
--   drop trigger if exists trg_promote_bootstrap_admin on app.users;
--   drop function if exists app.promote_bootstrap_admin();
--   -- (optionally) update app.users set role = 'member', updated_at = now()
--   --   where lower(email) = lower('claus.nisslmueller@gmail.com');

create or replace function app.promote_bootstrap_admin()
returns trigger
language plpgsql
as $$
begin
  if lower(new.email) = lower('claus.nisslmueller@gmail.com') then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_promote_bootstrap_admin on app.users;

create trigger trg_promote_bootstrap_admin
  before insert on app.users
  for each row
  execute function app.promote_bootstrap_admin();

-- Promote the account now if it already exists but was missed by 0016.
update app.users
set role = 'admin', updated_at = now()
where lower(email) = lower('claus.nisslmueller@gmail.com')
  and role <> 'admin';
