# /simulation-account-reset-safe

## Purpose
Guide a safe simulation account reset that preserves audit history and does not corrupt state.

## When to Use
- User wants to reset their simulation account to a fresh state
- Debugging simulation state that has become corrupt
- Setting up a new simulation account for testing

## Claude Code Prompt

```text
Perform a safe simulation account reset for Aurox.

Account to reset: [USER PROVIDES: account ID or "current user simulation account"]

IMPORTANT: This is a destructive operation. Confirm with the user before executing.

Safe reset procedure:
1. Do NOT delete simulation history — archive or soft-delete it
2. Create a new simulation_account record with fresh starting balance
3. Create a new simulation_portfolio linked to the new account
4. Set all positions to zero
5. Set cash balance to the configured starting amount
6. Do NOT delete simulation_transactions (preserve audit trail)
7. Do NOT delete simulation_orders (preserve audit trail)
8. Mark the reset event in an audit log if one exists
9. Revalidate the portfolio read model after reset

Check:
- Is the reset implemented as a DB transaction?
- Does it preserve the audit trail?
- Does it create a clean starting state without corrupting history?
- Is the reset event itself logged?

Report:

Simulation Reset Plan
======================
Action: Archive existing state / Soft-delete / Hard-delete
Starting balance: <configured amount>
Audit trail: preserved / lost

Steps to execute:
1. [confirm with user before proceeding]
2. ...

Post-reset verification:
- Portfolio shows zero positions: YES / NO
- Cash balance reset: YES / NO
- Order history preserved: YES / NO
- Transaction history preserved: YES / NO
```

## Validation Commands
```bash
pnpm --filter @repo/db typecheck
node packages/db/scripts/migrate.mjs
```

## Expected Output
Safe reset procedure with explicit confirmation step before any data modification.

## Safety Notes
- ALWAYS get explicit user confirmation before resetting.
- Never delete transaction or order history — archive or soft-delete only.
- Reset must be a single DB transaction, not multiple separate mutations.
