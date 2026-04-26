# /live-readiness-check

## Purpose
Verify all readiness gates before considering enabling any live execution capability.

## When to Use
- When evaluating whether the system is ready to transition from simulation to paper or live
- After major changes to execution or broker adapter code
- As part of a release checklist

## Claude Code Prompt

```text
Run a live readiness check for Aurox.

This is NOT about enabling live trading. This is about assessing current readiness state.

Check each gate:

1. Broker adapter
   - Is a real broker adapter implemented? (not stub)
   - Is it tested against the broker sandbox?
   - Is error handling complete?

2. Risk system
   - Are all risk checks mandatory and not bypassable?
   - Are drawdown limits enforced?
   - Are position size limits enforced?

3. Execution mode gating
   - Is simulation the default execution target?
   - Is live execution explicitly gated behind a readiness check?
   - Is autonomous live execution disabled?

4. Kill switch
   - Is there a kill switch that halts all execution?
   - Is the kill switch accessible without code deployment?

5. Observability
   - Are all execution events logged?
   - Are broker errors surfaced in logs?
   - Is there alerting on execution failures?

6. Data freshness
   - Is stale data explicitly handled before order submission?
   - Does stale data block execution (not just warn)?

Report:

Live Readiness Check
====================
Broker adapter: NOT READY / SANDBOX READY / PRODUCTION READY
Risk gates: COMPLETE / INCOMPLETE (list gaps)
Execution mode gating: SAFE / UNSAFE
Kill switch: PRESENT / MISSING
Observability: PRESENT / PARTIAL / MISSING
Data freshness enforcement: ENFORCED / MISSING

Overall live readiness: NOT READY / CONDITIONALLY READY / READY

Blockers:
1. ...

Recommended steps before live:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/agents typecheck
pnpm --filter @repo/agents test
```

## Expected Output
Gated readiness assessment. Should return NOT READY until all gates pass.

## Safety Notes
- This command assesses readiness. It does NOT enable live trading.
- Live execution must never be enabled by default.
