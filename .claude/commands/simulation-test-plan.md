# /simulation-test-plan

## Purpose
Generate a comprehensive test plan specifically for simulation trading engine correctness.

## When to Use
- Before any simulation engine change
- After adding new order types or position logic
- When simulation accounting results are questionable

## Claude Code Prompt

```text
Generate a test plan for the Aurox simulation trading engine.

The simulation is a financial accounting engine, not a visual demo. Tests must verify:

1. Order submission
   - Valid buy order with sufficient cash → PENDING → FILLED
   - Buy order with insufficient cash → REJECTED
   - Sell order with position → PENDING → FILLED
   - Sell order without position → REJECTED
   - Order below min quantity → REJECTED
   - Order below min notional → REJECTED

2. Accounting integrity
   - Cash decreases by (quantity × price + fee) on buy FILL
   - Cash increases by (quantity × price - fee) on sell FILL
   - Position quantity increases by quantity on buy FILL
   - Position quantity decreases by quantity on sell FILL
   - Transaction log has matching entry for every FILL

3. PnL correctness
   - Unrealized PnL = (current price - avg cost) × quantity
   - Realized PnL updates correctly on partial closes
   - Avg cost updates correctly on averaged-up buys

4. Portfolio snapshots
   - Snapshot is created after each FILL
   - Snapshot total = cash + sum(position value)

5. Edge cases
   - Fill at zero price → rejected
   - Multiple concurrent orders → cash does not over-allocate
   - Reset account → zero positions, starting cash, preserved history

For each test, specify:
- Name, inputs, expected outcome, invariant verified

Test file: packages/db/src/__tests__/simulation-engine.test.ts (or existing test location)
```

## Validation Commands
```bash
pnpm --filter @repo/db test
pnpm --filter @repo/agents test
```

## Expected Output
Complete simulation accounting test plan with specific invariants per test case.

## Safety Notes
- Accounting tests must use real DB fixtures, not mocked state.
- Every FILL must produce a matching transaction — this is the most critical invariant.
