# /manual-trade-flow-check

## Purpose
Verify the full manual trade flow from UI form submission to simulation order execution and portfolio update.

## When to Use
- After changes to the trade ticket or order submission
- After changes to simulation order processing
- When manual trades are failing silently

## Claude Code Prompt

```text
Verify the Aurox manual trade flow end-to-end.

Trace the write path:
UI trade form
  → Server Action (apps/web/server/actions/)
  → Zod validation (check input schema)
  → Domain service (apps/web/server/services/)
  → Agent workflow (packages/agents/src/workflows/)
  → Risk check (passes or rejects)
  → Simulation order repository (packages/db/src/)
  → Transaction log
  → Portfolio state update
  → Read model revalidation

Verify each step:
1. Is input validated with Zod before processing?
2. Is the execution mode checked (simulation vs live)?
3. Is the risk check mandatory and not bypassable?
4. Are instrument constraints checked (min qty, min notional)?
5. Is cash availability checked for buys?
6. Is position availability checked for sells?
7. Is the order written transactionally with the transaction log?
8. Is the portfolio read model revalidated after the trade?
9. Is failure at any step returning a safe error (not silently mutating state)?

Report:

Manual Trade Flow Check
=======================
Write path: complete / broken at step <N>

Validation: present / missing
Risk check: mandatory / bypassable
Instrument constraints: checked / unchecked
Cash check: present / missing
Position check: present / missing
Transaction log: present / missing
Portfolio revalidation: present / missing

Issues:
- ...

Recommended fixes:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/agents typecheck
pnpm --filter @repo/db typecheck
pnpm build:web
```

## Expected Output
Complete trace of trade flow with specific gap identification.

## Safety Notes
- Risk check must never be skippable.
- Partial state mutations (order written but no transaction) are critical defects.
