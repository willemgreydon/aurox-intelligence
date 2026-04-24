# Architecture Delta: Simulation to Real Microtrading

This document defines required architecture changes to move from simulation execution to controlled real execution.

## 1. Execution Abstraction Enhancements

Current seam exists (`simulation` vs `live`) and must be expanded with:
- partial-fill support
- cancel/replace support
- broker-native order state sync
- reconciliation status model

## 2. New Persistence Requirements

Add normalized tables (or equivalent) for:
- execution records
- broker orders
- fill events
- reconciliation results
- policy decision log
- kill-switch events

## 3. Policy Engine Responsibilities

Policy engine must validate every outbound live order:
- lane enabled for live
- account/lane capital limits
- per-trade notional and quantity bounds
- instrument allowlist membership
- frequency and cooldown compliance

Policy deny should be first-class and persisted.

## 4. Lane-Centric Control Plane

Each lane must carry configuration for:
- autonomy level
- allowed instruments
- max active positions
- max trade notional
- min trade notional
- trade cadence limits
- stop conditions

## 5. Reconciliation Plane

Implement background reconciliation loops:
1. fetch broker order/fill states
2. compare against internal state
3. repair drift when safe
4. escalate unresolved mismatches

## 6. Read Model Additions

Invest/read surfaces need live-specific fields:
- pending orders
- partially filled quantities
- broker reject reasons
- realized fee/slippage totals
- reconciliation health

## 7. Failure Domain Isolation

Isolate adapter failures from core product by:
- circuit breakers
- provider/broker timeout envelopes
- retry strategy with bounded attempts
- degraded mode fallback

## 8. Migration Path

Phase progression:
1. simulation hardening complete
2. paper-live shadow mode (no order submit)
3. manual guarded live
4. AI-suggested live
5. AI-autonomous live on limited lanes

No phase skipping.
