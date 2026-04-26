# /risk-gate-audit

## Purpose
Audit all execution paths to ensure risk gates are present, mandatory, and not bypassable.

## When to Use
- Before any live execution work
- After changes to agent workflows or order processing
- When reviewing a PR that touches risk or execution code

## Claude Code Prompt

```text
Audit risk gate coverage across all Aurox execution paths.

Check packages/agents/src/workflows/:
1. Does every trade workflow call a risk check before submitting an order?
2. Is the risk check result checked explicitly?
3. Can any code path reach order submission without passing risk?
4. Is there a bypass mode or skip flag for risk checks?

Check packages/db/src/ simulation order processing:
5. Is risk validated before writing the order?
6. Is validation failure logged with reason?
7. Is the order state set to REJECTED (not silently dropped)?

Check these risk checks exist and are not mocked:
- Max exposure per asset
- Max position size
- Max drawdown threshold
- Liquidity threshold
- Slippage estimate
- Instrument constraints (min qty, min notional)
- Data freshness check

Report:

Risk Gate Audit
===============
Critical: Risk bypassable: YES (BLOCKED) / NO

Execution paths without risk check:
- ...

Risk checks that are optional (should be mandatory):
- ...

Risk check results not validated:
- ...

Missing risk checks:
- ...

Overall: PASS / BLOCKED

Required fixes before any live execution:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/agents typecheck
pnpm --filter @repo/agents test
```

## Expected Output
Complete risk gate coverage map with any bypasses flagged as critical.

## Safety Notes
- A bypassed risk check is a production blocker.
