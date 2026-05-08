# Market Observation Workstation Audit (May 8, 2026)

## Existing Observation Features
- `apps/web/components/charts/market-graph-workspace.tsx`
  - Market chart workstation with watchlist mini-board, news observer, broker-lane status.
- `apps/web/app/news/page.tsx` + `apps/web/server/queries/news-query.ts`
  - Provider-backed normalized news stream with fallback/degraded states.
- `apps/web/app/signals/page.tsx` + `apps/web/server/services/analysis-service.ts`
  - Signal table + breakdown + basic history tabs (mostly placeholder analytics).
- `apps/web/app/portfolio/intelligence/page.tsx` + `apps/web/server/services/portfolio-intelligence-service.ts`
  - Allocation/risk/regime/ranking with simulation broker previews.
- `apps/web/app/invest/stocks|etfs|crypto/page.tsx`
  - Lane-specific asset lists, watchlist actions, simulation-oriented workflows.
- `apps/web/app/admin/monitoring/*`
  - Provider monitoring surfaces and readiness context.
- `packages/ai-market-intelligence/src/news/news-impact.ts`
  - Deterministic news impact scoring and risk-flag mapping.
- `packages/ai-market-intelligence/src/orchestration/system-orchestrator.ts`
  - Deterministic recommendation orchestration and provider/news risk summaries.

## High-Value Gaps Found
- No dedicated unified observation route (`/observe`) aggregating signal/news/risk/anomaly/provider/portfolio events.
- No explicit market-event timeline module.
- No anomaly radar with deterministic 0-100 scoring and severity bands.
- Watchlist intelligence lacks integrated signal/risk/news/freshness/action view in one table.
- No explicit simulation-only trade readiness preflight status model in observation UX.
- Regime context exists in portfolio intelligence but not as unified market observer feed context.

## Data Already Available to Reuse
- System recommendations, top opportunities, risk classes: `market-intelligence-workstation-service` via orchestrator.
- Portfolio risk overlays, diagnostics, concentration, confidence: `portfolio-intelligence-service`.
- Watchlist + quote freshness: `simulation-workstation-service`.
- News sentiment/relevance/risk flags: `news-query` + news impact engine.

## Placeholder/Degraded Areas
- Signals history analytics in `/signals` still contains n/a placeholders for ROI/outcome.
- Some monitoring and lane modules show degraded/provider fallback notices; should propagate as observation warnings.
- Watchlist/news mini-panels are useful but not yet deep explainability feeds.

## Extension Plan (Applied)
- Add deterministic observation engine utilities in `apps/web/server/lib/market-observation-engine.ts`.
- Add unified observation aggregation service in `apps/web/server/services/market-observation-service.ts`.
- Add new route `/observe` and workstation UI modules for:
  - AI Market Observer feed
  - Market Event Timeline
  - Anomaly Radar
  - Watchlist Intelligence
  - Trade Readiness Check
- Add tests for anomaly scoring, severity mapping, regime detection, and readiness gating.
