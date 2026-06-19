# Aurox Intelligence — Operational Runbooks

This folder contains the operational runbooks for running Aurox Intelligence in
production. Aurox is a **deterministic-first, simulation-first** financial
intelligence platform. Live trading is gated and not enabled by default; today
all execution is simulation. These runbooks are written so an on-call operator
can act under pressure without re-deriving the system from source.

## Scope and posture

- Simulation is the default and only active execution target. Live execution is
  locked behind the readiness gate (see
  [`docs/live-microtrading/readiness-checklist.md`](../live-microtrading/readiness-checklist.md)).
- Several controls described in the live-microtrading docs are **TARGET / planned**.
  Each runbook marks planned-vs-implemented honestly so you never rely on a
  control that is not yet wired in.
- When in doubt, choose the safest deterministic action. Stopping is always safe;
  proceeding under uncertainty is not.

## Runbook index

| Runbook | Use when |
|---|---|
| [provider-outage.md](./provider-outage.md) | Market data provider is down, slow, or rate-limited; prices look stale or missing. |
| [kill-switch-activation.md](./kill-switch-activation.md) | You need to halt execution (simulation now, live in future). |
| [simulation-account-reset.md](./simulation-account-reset.md) | A simulation account must be reset/archived without destroying the audit trail. |
| [db-migration.md](./db-migration.md) | Applying a schema migration safely. |
| [incident-response.md](./incident-response.md) | Any production incident — the general detect → contain → diagnose → remediate → post-mortem flow. |
| [deploy-and-rollback.md](./deploy-and-rollback.md) | Shipping a change and rolling it back (code vs data). |

## How to use a runbook

Every runbook follows the same structure:

1. **Symptoms / Trigger** — how you know this runbook applies.
2. **Severity** — see the severity table below.
3. **Preconditions** — access, env, and state you must confirm first.
4. **Step-by-step actions** — numbered, with real commands. Do not skip steps.
5. **Verification** — how to confirm the action worked.
6. **Rollback / Recovery** — how to get back to a safe state.
7. **Post-incident follow-up** — what must happen after the dust settles.

Read the whole runbook once before acting. Run commands from the repo root
(`/Users/clausrainer/Apps/aurox-intelligence`) unless stated otherwise.

## Severity levels

| Severity | Definition | Target response |
|---|---|---|
| **SEV-1 — Critical** | Capital-affecting or execution-state-corrupting: phantom trades, accounting inconsistency, accidental live path, or risk gate bypassed. | Immediate. Contain first (kill switch / halt), notify on-call, then diagnose. |
| **SEV-2 — High** | User-facing financial display is wrong or unavailable (stale prices feeding signals, portfolio page blank, provider chain exhausted). No capital corruption. | Within the hour. Degrade gracefully, surface the degraded state to users, fix forward. |
| **SEV-3 — Moderate** | Partial degradation with safe fallback active (single provider down, elevated latency, one cache cold). System still correct. | Same day. Monitor, plan a fix, no emergency action. |
| **SEV-4 — Low** | Cosmetic or non-financial (logging gap, lint, docs drift). | Backlog. Track and schedule. |

When a runbook does not state a severity for your exact situation, round **up**.

## Who acts and escalation

Aurox does not yet have a formal paging rotation. Until one exists, the acting
operator is **whoever is on the change** (the engineer who deployed, or the repo
owner). Escalation order:

1. **Acting operator** — runs the relevant runbook, contains the issue.
2. **Repo owner** — for any SEV-1, any live-path change, any destructive DB
   operation, or any kill-switch activation.
3. **Post-mortem owner** — assigned at incident close for SEV-1/SEV-2; owns the
   write-up and follow-up tasks.

Hard escalation rules (do not self-authorize):

- A **destructive** DB migration (drop column/table, irreversible data change)
  requires repo-owner sign-off and a confirmed backup — see
  [db-migration.md](./db-migration.md).
- Any change that **enables or eases the live execution path** requires repo-owner
  sign-off — see [`.claude/rules/live-trading-lock.md`](../../.claude/rules/live-trading-lock.md).
- Re-enabling execution after a halt requires explicit confirmation — see
  [kill-switch-activation.md](./kill-switch-activation.md).

## Grounding references

These runbooks are derived from the live source of truth. Key references:

- Kill switch / governance: [`apps/web/lib/governance-gate.ts`](../../apps/web/lib/governance-gate.ts)
- Live readiness gate: [`packages/agents/src/readiness/live-readiness-gate.ts`](../../packages/agents/src/readiness/live-readiness-gate.ts), [`packages/agents/src/execution/live-readiness-gate.ts`](../../packages/agents/src/execution/live-readiness-gate.ts)
- Provider health/fallback: [`packages/providers/src/market/provider-registry.ts`](../../packages/providers/src/market/provider-registry.ts)
- Simulation reset (audit-safe): [`packages/db/src/repositories/simulated-trading-repository.ts`](../../packages/db/src/repositories/simulated-trading-repository.ts)
- Migration runner: [`packages/db/scripts/migrate.mjs`](../../packages/db/scripts/migrate.mjs)
- Live incident runbook: [`docs/live-microtrading/incident-response-and-kill-switch.md`](../live-microtrading/incident-response-and-kill-switch.md)
- Operating rules: [`.claude/rules/`](../../.claude/rules/)
