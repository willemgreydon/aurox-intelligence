# Broker Constraints and Order Sizing

This document addresses feasibility and sizing for microtrading.

## Key Reality

Micro-order sizes are broker and instrument dependent.

Possible constraints include:
- min notional (e.g., order must be above a minimum currency amount)
- min quantity (fractional rules differ by instrument)
- step size (quantity increment granularity)
- tick size (price increment granularity)

## Why 0.1 cent or 5 EUR may fail

An order such as very tiny cent-level notional may be impossible if:
- broker min notional is higher
- instrument price makes min quantity exceed target notional
- step size cannot express desired amount

Therefore, feasibility must be computed before submit.

## Required Sizing Engine Inputs

- account currency and balance
- lane allocation cap
- instrument quote
- instrument min/max notional
- instrument min/max quantity
- quantity step size
- price tick size
- broker fee schedule

## Sizing Algorithm Outline

1. compute desired notional from lane strategy
2. clamp to lane min/max
3. clamp to broker instrument min/max
4. convert to quantity using quote
5. round quantity to allowed step size
6. verify resulting notional still valid
7. deny if below constraints after rounding

## UI/UX Requirements

When an order is blocked by constraints, show:
- actual broker minimum
- requested amount
- nearest valid amount

## Operational Recommendation

Maintain a broker constraint cache refreshed frequently, and fail closed when constraint data is unavailable.
