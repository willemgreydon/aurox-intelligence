# /order-lifecycle-debug

## Purpose
Debug a stuck, incorrect, or missing order state transition in the simulation engine.

## When to Use
- Order is stuck in PENDING
- Order shows FILLED but portfolio did not update
- Order is missing from history
- Order state is inconsistent with transaction log

## Claude Code Prompt

```text
Debug an order lifecycle issue in the Aurox simulation engine.

Order to debug: [USER PROVIDES: order ID or description of the stuck state]

Trace:
1. Find the order in packages/db/src/ simulation_orders table
2. Check the order's current status
3. Check if a corresponding transaction exists in simulation_transactions
4. Check if the position was updated in simulation_positions
5. Check if the portfolio snapshot was taken after this order
6. Check for any error logs in packages/observability/

Valid order states (check if yours is valid):
- PENDING → SUBMITTED → FILLED / REJECTED / CANCELLED
- FILLED must have a corresponding transaction
- REJECTED must have a rejection reason
- CANCELLED must preserve state consistency

Check:
- Is the order state machine complete and explicit?
- Is there a state transition that mutates order but not the transaction?
- Is there a missing revalidation after fill?

Report:

Order Lifecycle Debug
======================
Order status: <status>
Expected status: <status>

Transaction found: YES / NO
Position updated: YES / NO
Portfolio snapshot taken: YES / NO

State machine gap:
- Transition: <from> → <to>
  Issue: <description>

Recommended fix:
- ...
```

## Validation Commands
```bash
pnpm --filter @repo/db typecheck
pnpm --filter @repo/agents typecheck
```

## Expected Output
Specific state machine gap with the exact fix needed.

## Safety Notes
- Never manually update order state without also updating the transaction log.
- A FILLED order with no transaction is a critical accounting defect.
