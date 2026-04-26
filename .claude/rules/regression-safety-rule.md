# Regression Safety Rule

## Purpose
Changes to execution, risk, simulation accounting, and signal packages carry the highest regression risk. Before shipping any change in these domains, a targeted regression check must be performed.

## Applies To
- `packages/agents/`
- `packages/signals/`
- `packages/forecasting/`
- `packages/db/` (simulation tables)
- `apps/web/server/actions/` (execution actions)

## Rule
High-risk change categories requiring regression verification:

| Change Type | Regression Check Required |
|---|---|
| Signal scoring formula change | Test with known-input/known-output fixtures |
| Risk check logic change | Test with boundary values for each check |
| Simulation order submission change | Test order lifecycle: submit → fill → position update |
| PnL calculation change | Verify with exact computed values, compare pre/post |
| DB migration (additive) | Test existing data queries still work |
| DB migration (destructive) | Must not proceed without explicit confirmation and backup plan |
| Execution mode routing change | Test simulation stays default, live stays gated |
| Provider fallback chain change | Test behavior when primary fails, secondary fails, all fail |

For all changes in these areas:
1. Run the relevant package tests before and after the change
2. Note any tests that change from PASS to FAIL (new regression)
3. Note any tests that change from FAIL to PASS (fixed regression)
4. Never mark a test as "known baseline" without verifying it predates the current change

## Forbidden
- Changing a signal formula without a before/after comparison
- Changing simulation accounting without running simulation order tests
- A DB migration that touches `simulation_transactions` without verifying the order lifecycle test
- Changing execution mode routing without testing that simulation remains default
- Removing tests to make a test suite "pass"

## Required Pattern
```bash
# Before making a change to packages/signals:
pnpm --filter @repo/signals test > before-test-output.txt

# Make the change

# After:
pnpm --filter @repo/signals test > after-test-output.txt

# Compare:
diff before-test-output.txt after-test-output.txt
# Any new FAIL = introduced regression — must fix before shipping
```

## Validation
```bash
pnpm --filter @repo/signals test
pnpm --filter @repo/agents test
pnpm --filter @repo/db typecheck
pnpm --filter @repo/forecasting test
```

## Good Example
```text
Before change: packages/signals — 12 tests passing
After change: packages/signals — 12 tests passing, 1 new test added
→ No regression introduced, coverage improved
```

## Bad Example
```text
Before change: packages/signals — 12 tests passing
After change: packages/signals — 11 tests passing (1 failing)
"The failing test was already flaky — marking as baseline"
→ This is a regression introduced by the change, not a baseline
```

## Safety Notes
A signal regression that produces wrong scores is not a test problem — it is an execution problem. A wrong signal can trigger an execution decision based on incorrect data. Tests for signal scoring, risk checks, and simulation accounting are not optional coverage — they are the primary correctness verification mechanism.
