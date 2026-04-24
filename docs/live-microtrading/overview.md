# Live Microtrading Transition Overview

This folder defines the complete transition blueprint from simulation to real AI-assisted and AI-autonomous microtrading.

## Current State

Aurox currently runs a simulation-first execution model with persisted accounting and lane-aware controls.

## Target State

Aurox should support staged real-money trading under strict controls:

1. `manual_live_guarded`
- user-triggered live trades
- no autonomous dispatch

2. `ai_suggested_live`
- AI proposes trades
- human approval required per order or per bounded session policy

3. `ai_autonomous_live_limited`
- autonomous execution enabled only for approved lanes
- strict per-lane capital and risk envelopes
- always-on kill switch

## Required Blueprint Documents

- `readiness-checklist.md`
- `architecture-delta.md`
- `lane-autonomy-model.md`
- `risk-policy-and-guards.md`
- `broker-constraints-and-order-sizing.md`
- `rollout-plan.md`
- `incident-response-and-kill-switch.md`

## Critical Principle

Autonomy level must be a lane-level setting, not a global toggle.

## Micro-Order Feasibility Note

Very small order sizes (for example around one tenth of a cent or a few euros) are only possible when the broker and instrument support the required minimum notional/quantity and precision steps.

This must be validated per broker + instrument pair before enabling execution.
