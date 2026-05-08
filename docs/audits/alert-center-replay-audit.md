# Alert Center + Intelligence Replay Audit

Date: 2026-05-08

## Current persisted observation state
- `app.observation_events` already persists normalized observation events with dedupe (`fingerprint + bucket_hour`).
- `app.observation_event_states` persists per-user read/pin/dismiss state.
- `/observe/[id]` already renders event detail from persistence.
- `market-observation-service` generates observations/timeline/anomalies and upserts observation events.

## What can become alerts immediately
- Observation feed items (`signal`, `risk`, `provider`, `anomaly`, `portfolio`).
- Timeline events (`signal_flip`, `news_shock`, `provider_degradation`, `portfolio_risk_change`).
- Cross-asset relationship insights (new source class `relationship`).
- Trade readiness degradations and outcome updates from linked simulated orders.

## Replay inputs currently available
- Observation event core context: source, severity, description, metadata, observedAt.
- Related IDs already supported: `relatedSignalId`, `relatedNewsId`, `relatedRiskId`, `relatedDecisionId`, `relatedOrderId`.
- Outcome enrichment available via `observation-outcome-service` using simulated orders.
- Portfolio/signal/risk/news/regime context can be reconstructed from `getObserveViewModel`.

## Missing pieces identified
- No dedicated alert persistence model with status lifecycle (`OPEN/READ/PINNED/SNOOZED/DISMISSED/RESOLVED`).
- No alert-centric route (`/alerts`) with grouped severity workflow.
- No replay route/service that reconstructs before/after context and decision/outcome trail.
- Loading coverage does not yet include `/alerts` or `/replay/[id]`.

## Patch plan
1. Add alert persistence tables + repository (`alerts`, `alert_states`) with dedupe/cooldown handling.
2. Add deterministic alert generation engine from observe/anomaly/relationship/outcome signals.
3. Add alert center service + `/alerts` route + interaction API.
4. Add intelligence replay service + `/replay/[id]` route.
5. Add loading routes and extend loading coverage tests.
6. Add focused tests for dedupe, state transitions, severity mapping, replay fallback behavior, and command/route coverage.
