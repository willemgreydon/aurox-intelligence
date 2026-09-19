-- Migration: 0016_seed_bootstrap_admin
-- Purpose:  Promote the bootstrap operator account to admin so the admin-gated
--           user-role management surface (/admin/users) has an initial
--           administrator. An admin-gated action cannot create the first admin
--           (chicken-and-egg), so the bootstrap admin is seeded here, in version
--           control, rather than by a manual production SQL edit.
-- Reversibility: EASY (data-only, no schema change). Rollback:
--   update app.users set role = 'member', updated_at = now()
--   where lower(email) = lower('claus.nisslmueller@gmail.com');
-- Idempotent: matches case-insensitively, only touches rows not already admin,
--   and is a no-op if the user has not registered yet or is already admin.
update app.users
set role = 'admin', updated_at = now()
where lower(email) = lower('claus.nisslmueller@gmail.com')
  and role <> 'admin';
