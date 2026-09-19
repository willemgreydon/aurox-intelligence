# Auth, Users & Roles

_Status: current as of the admin audit-log slice (migration `0017`). Scope: identity, session, and the admin/role model. Not the simulation-account domain._

---

## 1. Data model

Single user store, schema `app` (`packages/db/src/migrations/0001_auth_session_neon.sql`):

- **`app.users`** — `id`, `email` (unique), `password_hash`, `display_name`, **`role`** (`member` | `admin`, check-constrained, default `member`), `status` (`pending_verification` | `active` | `disabled`), `avatar_url`, `email_verified_at`, `last_login_at`, timestamps.
- **`app.auth_accounts`** — provider linkage (`credentials` today; OAuth-ready via `provider` / `provider_account_id` / `metadata`).
- **`app.sessions`** — opaque `session_token_hash`, `expires_at`, `revoked_at`, `last_seen_at`, `ip_address`, `user_agent`.
- **`app.verification_tokens`** — email verification / password reset / magic link / email change.

Role is **flat two-tier**, not RBAC. There is no permissions table, no `plan`/`tier`, no `is_admin` boolean. The single source of truth for the enum is `userRoleSchema` in `packages/api-contracts/src/account/account.ts`.

## 2. Read path (session)

`getOptionalCurrentSession` (`apps/web/server/auth/session.ts`) reads the signed cookie → `findSessionByToken` (join `sessions`→`users`) → validates with `authenticatedSessionSchema`. **Role travels on the session.** Fails **closed → anonymous** on DB outage (never throws at root layout). `requireCurrentSession` / `requireCurrentUser` redirect to login. There is intentionally **no `requireAdmin` helper** — admin is checked inline.

## 3. Enforcement

- **Gate:** `apps/web/app/admin/layout.tsx` — `if (auth.user.role !== 'admin') notFound()` on the whole `/admin` subtree.
- **Defense-in-depth:** each admin server action re-checks the role itself (never trusts the layout alone).

## 4. Role management (write path)

Canonical write path, admin only:

```
/admin/users (UI)
  → setUserRoleAction        apps/web/server/actions/admin-user-actions.ts
    · re-verify admin
    · Zod: setUserRoleInputSchema
    · block self role change  (anti-lockout)
    · actor identity taken from the verified session, never the form
  → updateAuthUserRole       packages/db — TRANSACTION:
      SELECT role FOR UPDATE → UPDATE users.role → INSERT admin_events
  → revalidatePath('/admin/users')
```

The role change and its audit row are written in **one transaction** — a role change can never exist without its audit record (or vice versa). Read side mirrors it: `admin-users-query` (users + recent events in parallel) → `admin-users-mapper` (pure view model) → `admin-users-service` → `page.tsx` (`force-dynamic`), which renders both the roster and a "Recent role changes" panel.

## 4a. Audit trail

**`app.admin_events`** (`0017_admin_audit_events.sql`) — append-only: `id`, `event_type` (`user_role_changed`, check-constrained + extensible), `actor_user_id`/`actor_email`, `target_user_id`, `before_value`/`after_value`, `reason`, `metadata jsonb`, `created_at`. FKs use `on delete set null` so events survive account removal. Written by `updateAuthUserRole`, read by `listRecentAdminEvents`. Immutable by convention — no code issues `UPDATE`/`DELETE` against it.

## 5. Bootstrap

An admin-gated action cannot mint the first admin. Migration **`0016_seed_bootstrap_admin.sql`** promotes one hardcoded email (`claus.nisslmueller@gmail.com`), idempotently, in version control. It only fires once that email has registered; re-runnable safely. After that, all promotion is UI-driven.

---

## 6. Maturity assessment

| Area | State | Notes |
|---|---|---|
| Identity & sessions | **Strong** | Hashed opaque tokens, revocation, expiry, fail-closed reads, signed cookies. Production-grade. |
| Password / verification | **Solid** | Password policy, reset + email-verification token types modeled. |
| Role model | **Adequate (v1)** | Two-tier, end-to-end typed, gated, anti-lockout. Correct but coarse. |
| Auditability | **Solid for roles** | Role changes now write an append-only `admin_events` record atomically. **Profile/password changes and account-status changes remain unaudited** — extend the same table to close this. |
| Authorization design | **Thin** | No permission granularity, no `requireAdmin` abstraction, no policy layer. Every gate is a hand-written `role !== 'admin'`. |
| Account lifecycle admin | **Missing** | No way to disable/reactivate a user, force logout, resend verification, or delete/anonymize (GDPR). |
| OAuth / SSO | **Scaffolded, unused** | `auth_accounts` shape supports it; no provider wired. |
| Tests | **Gap** | New repo fn, action guards, and mapper are untested. |

**Headline:** authentication is mature; **authorization and account governance are early.** The role column is the right primitive, but the surrounding admin capabilities and audit trail lag the financial-safety bar the rest of the codebase holds.

---

## 7. Next strong feature ideas (prioritized)

- ~~**Admin audit log**~~ — **DONE** (`app.admin_events`, migration `0017`). Role changes are now atomically audited and surfaced on `/admin/users`. Follow-on: extend the same table to profile/password/status changes and add a `reason` capture in the UI.
1. **`requireAdmin` / policy helper** — collapse the scattered inline `role !== 'admin'` checks into one typed guard (`requireRole('admin')`), the seam a future permission system plugs into. Cheap hardening, removes drift risk. _Small._
2. **Account lifecycle actions** — disable / reactivate a user, force session revocation (kill all sessions), resend verification. Leverages existing `status` + `sessions.revoked_at`, and emits `admin_events` for each. Turns `/admin/users` from a role toggle into real operator control. _Medium._
3. **Capability-based permissions (RBAC-lite)** — evolve `role` into role→capability mapping (e.g. `manage_users`, `activate_live`, `configure_providers`). Unblocks a real operator/analyst/viewer split and gates the sensitive live-trading surfaces distinctly. Wire the existing `aurox-permission-system` skill to actual code. _Large._
4. **Live-trading role gate** — tie `assertLiveReadinessGate` to an explicit elevated capability so enabling live execution requires more than generic admin. Directly serves the simulation-first / live-locked doctrine. _Medium._
5. **GDPR data controls** — export + anonymize/delete a user (archive, don't hard-delete, per the auditability rules). Legal necessity as the user base grows. _Medium._
6. **OAuth/SSO provider** — activate the dormant `auth_accounts` model (Google first). Removes password burden; broadens onboarding. _Medium._

**Recommended sequence:** audit log ✓ → 1 → 2 (governance foundation), then 3/4 together (the real authorization leap), then 5/6 as reach expands.
