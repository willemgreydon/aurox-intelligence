# Intelligence Memory Storage

## Purpose
This schema stores explainable historical context used by Aurox intelligence, reporting, and broker-decision audit trails while keeping deterministic execution controls primary.

## Tables
- `app.asset_snapshots`
- `app.lane_snapshots`
- `app.signal_decision_traces`
- `app.broker_decision_traces`
- `app.news_items`
- `app.news_impact_traces`
- `app.report_artifacts`
- `app.intelligence_memory_chunks`

## Required Trace Fields
Each trace/snapshot record includes:
- `source_type`
- `source_id`
- `asset_ids` / `symbols`
- `time_window_start` / `time_window_end`
- `metrics` (JSON)
- `explanation`
- `confidence`
- `version_hash`
- `created_at`

## Retention / Pruning
- Default retention policy: 90 days for trace-style tables.
- Implemented via `pruneIntelligenceMemory(retentionDays)` in `packages/db`.
- Longer retention can be applied for regulated audit contexts by raising retentionDays.

## Safety Constraints
- Simulation-first posture is unchanged.
- Stored intelligence traces are explanatory and audit-focused only.
- No storage operation bypasses policy/risk execution checks.
