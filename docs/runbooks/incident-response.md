# Runbook: Incident Response (General Flow)

The general flow for any Aurox production incident:
**detect → contain → diagnose → remediate → post-mortem.** For execution-specific
incidents (rogue fills, reconciliation mismatches, live-path concerns) this
runbook defers to the live-microtrading incident runbook —
[`docs/live-microtrading/incident-response-and-kill-switch.md`](../live-microtrading/incident-response-and-kill-switch.md)
— which this document complements with the operational mechanics.

Related:
[`.claude/rules/kill-switch-rule.md`](../../.claude/rules/kill-switch-rule.md),
[`.claude/rules/aurox-execution-risk.md`](../../.claude/rules/aurox-execution-risk.md).

## Symptoms / Trigger

Anything that threatens correctness, capital, or availability:

- Capital/accounting anomaly (phantom positions, wrong PnL, balance mismatch).
- Suspected risk-gate bypass or accidental live-path activation.
- Market-data integrity problem (see [provider-outage.md](./provider-outage.md)).
- Platform outage or severe degradation of an execution-adjacent screen.

## Severity

Set per the [severity table](./README.md#severity-levels). Capital-affecting or
execution-integrity incidents are **SEV-1**. When unsure, round up.

## Preconditions

- Repo access, log access, and the ability to take the execution surface offline.
- Repo owner reachable for SEV-1 escalation.

## Step-by-step actions

### 1. Detect

1. Establish what is wrong and how you know (alert, user report, log signal,
   reconciliation diff). Record the first-observed timestamp — this anchors the
   post-mortem timeline.
2. Identify scope: which accounts, asset classes, providers, or routes are
   affected. Determine whether it is execution-integrity (SEV-1) or
   display/availability (SEV-2/3).

### 2. Contain (stop the bleeding before diagnosing)

3. If execution integrity or capital is at risk, **halt execution first** — follow
   [kill-switch-activation.md](./kill-switch-activation.md). Operationally today
   that means taking the trade surface offline / read-only (the persisted
   governance halt wired into the workflow is still a TARGET — see that runbook).
4. For a single runaway simulation account, use Emergency Stop
   ([simulation-account-reset.md](./simulation-account-reset.md)).
5. For market-data incidents, contain per [provider-outage.md](./provider-outage.md)
   (pause the failing provider; confirm degraded—not fabricated—display).
6. **Snapshot state and logs now**, before further changes: capture current logs,
   recent simulation orders/transactions, and recent policy/gate decisions for the
   post-mortem. Do not mutate evidence.
7. Notify the repo owner / on-call (mandatory for SEV-1).

### 3. Diagnose

8. With the bleeding stopped, find the root cause. Use the immutable trail —
   `app.simulation_orders`, `app.simulation_transactions`, `app.simulation_snapshots`
   are append-only, so the history is intact (see
   [`.claude/rules/simulation-auditability-rule.md`](../../.claude/rules/simulation-auditability-rule.md)).
9. Inspect provider health (`getProviderHealthStatuses()`), gate decisions
   (`resolveExecutionGate`), and recent deploys (`git log --oneline -20`).
10. Reproduce deterministically where possible — Aurox is deterministic-first, so
    a correct root-cause analysis should be reproducible from fixed inputs.

### 4. Remediate

11. Apply the smallest safe fix. Respect package boundaries and the canonical
    write path (Zod → service → repository transaction → revalidate).
12. Validate the fix with targeted checks for the changed packages (see
    [deploy-and-rollback.md](./deploy-and-rollback.md) for the gate).
13. Add a regression test that would have caught the incident — for signal,
    risk, simulation-accounting, or gate logic this is mandatory, not optional.

### 5. Recover

14. Re-enable execution only via the gated recovery procedure
    ([kill-switch-activation.md](./kill-switch-activation.md#rollback--recovery-re-enable-execution)):
    root cause known, fix validated, repo-owner sign-off, gradual/manual-first
    re-enable.

## Verification

1. The triggering symptom is gone and cannot be reproduced from the original inputs.
2. No new anomalous orders/transactions after recovery.
3. The audit trail explains the full incident (nothing was deleted to "clean up").
4. Targeted package checks and `pnpm build:web` (if web changed) pass.

## Rollback / Recovery

- **Code-introduced incident:** `git revert` the offending commit — see
  [deploy-and-rollback.md](./deploy-and-rollback.md).
- **Data corruption:** reconstruct from snapshots + transaction log, or restore
  from a DB backup ([db-migration.md](./db-migration.md)). Never repair by deleting
  audit rows — append correcting records.

## Post-incident follow-up (post-mortem)

Per [`docs/live-microtrading/incident-response-and-kill-switch.md`](../live-microtrading/incident-response-and-kill-switch.md),
every SEV-1/SEV-2 closes with:

- An incident report with a complete timeline (detect → recover).
- A corrective-actions list with owners.
- Guardrail/policy updates and a policy version bump where execution is involved.
- New regression tests added to prevent recurrence.
- Assign a post-mortem owner at incident close.
