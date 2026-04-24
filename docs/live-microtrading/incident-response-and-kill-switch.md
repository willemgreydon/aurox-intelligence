# Incident Response and Kill Switch Runbook

This runbook defines actions when live microtrading behavior is unsafe or unstable.

## Kill Switch Types

1. Global Kill Switch
- disables all live submissions

2. Lane Kill Switch
- disables a specific lane only

3. Broker Adapter Kill Switch
- disables one broker pathway

## Trigger Conditions

- rapid loss acceleration
- sustained rejection spikes
- reconciliation mismatches beyond threshold
- stale/degraded data with active autonomy
- infrastructure incident affecting reliability

## Immediate Actions

1. Activate relevant kill switch.
2. Stop autonomous loops for affected scopes.
3. Snapshot runtime state and logs.
4. Notify operator/on-call.

## Triage Checklist

- confirm live submits are halted
- inspect latest policy decisions
- inspect broker responses and connectivity health
- inspect reconciliation diffs
- inspect market data freshness and integrity

## Recovery Protocol

Recovery requires:
- root cause identified
- fix deployed and validated in staging/shadow
- explicit operator sign-off
- gradual re-enable (manual first)

## Post-Incident Requirements

- incident report with timeline
- corrective actions list
- guardrail updates and policy version bump
- regression test additions
