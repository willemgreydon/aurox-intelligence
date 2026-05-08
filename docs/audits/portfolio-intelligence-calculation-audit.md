# Portfolio Intelligence Calculation Audit (May 8, 2026)

## Scope
Audit of portfolio intelligence/signal/risk KPI pipeline across:
- `apps/web/components/layout/header.tsx`
- `apps/web/server/services/portfolio-intelligence-service.ts`
- `apps/web/server/services/portfolio-service.ts`
- `apps/web/server/mappers/portfolio-mapper.ts`
- `apps/web/server/queries/portfolio-query.ts`
- `packages/ai-market-intelligence/src/portfolio/portfolio-intelligence-engine.ts`
- `apps/web/app/portfolio/intelligence/page.tsx`

## KPI Status Matrix

### 1) Portfolio Value / Cash Balance / Invested / Cash Target
- Status before patch: **inconsistent**
- Produced by:
  - Header: `getSimulationOverviewDataForUser(...).summary`
  - Portfolio Intelligence: `getInvestPortfolioData(...).summary` (different pipeline)
- Rendered by:
  - Header client portfolio snapshot
  - `/portfolio/intelligence` compact stat cards
- Issue:
  - Header showed ~1.3k while Portfolio Intelligence cards showed 0.
- Fix implemented:
  - Portfolio Intelligence service now derives canonical totals from `getSimulationOverviewDataForUser` (same source family as header) with fallback to portfolio read model.
  - Added explicit context fields: `baseCurrency`, `investedValue`, `cashTargetRatio`, `state`, `stateReason`.

### 2) Allocation Health State Semantics
- Status before patch: **partial/incorrect**
- Produced by:
  - `computePortfolioDiagnostics(...)` in portfolio intelligence engine
- Rendered by:
  - `/portfolio/intelligence` Allocation Health card
- Issue:
  - Generic “insufficient-data” shown even when ranked universe exists.
- Fix implemented:
  - Added service-level portfolio state classification:
    - `no-account`, `cash-only`, `no-positions`, `stale-market-data`, `active-portfolio`, `insufficient-data`
  - UI now uses `stateReason` for explanation text.

### 3) Avg Confidence
- Status before patch: **broken in practical cases**
- Produced by:
  - Diagnostics used unweighted average over active allocations.
  - Active allocations could collapse to empty due min-weight threshold.
- Rendered by:
  - `/portfolio/intelligence` Avg confidence card
- Issue:
  - Displayed 0.0% while ranking rows had valid confidence.
- Fix implemented:
  - Removed destructive default min threshold behavior (`minPositionWeight` default now 0).
  - Diagnostics confidence now **value/weight-weighted**.
  - UI fallback mode shows **Top 25 Avg Signal Confidence** when no active portfolio positions.

### 4) Avg Risk Score vs Concentration Risk
- Status before patch: **inconsistent**
- Produced by:
  - Risk overlay used static/liquid placeholder and old weighting that could underrepresent concentration.
- Rendered by:
  - Avg risk card + concentration risk card + risk table
- Issue:
  - Could show low composite with high concentration labels.
- Fix implemented:
  - Composite risk formula aligned to requested weighted model:
    - volatility 25%, liquidity 15%, news 15%, correlation 15%, provider 10%, concentration 20%.
  - Added explicit `concentrationRisk` component into risk overlay.

### 5) Cross-Asset Ranking Score
- Status before patch: **placeholder-like/flat**
- Produced by:
  - Ranking used `normalizedScore` (allocation-weight proxy), often flattened by thresholding.
- Rendered by:
  - Cross-asset ranking table
- Issue:
  - Scores clustered near zero and non-explainable.
- Fix implemented:
  - Added deterministic attractiveness score (0-100):
    - signal*40 + confidence*20 + liquidity*10 + news*10 + macro*10 - riskPenalty*20
  - Ranking table now displays real 0-100 score.

### 6) Risk Overlay Static Components
- Status before patch: **placeholder**
- Produced by:
  - `computeRiskOverlay(...)` used `liquidityRisk = 0.1` constant.
- Rendered by:
  - Risk overlay table and derived diagnostics
- Issue:
  - Identical-looking component values across assets.
- Fix implemented:
  - Replaced liquidity placeholder with deterministic proxy from uncertainty/risk context.
  - Added concentration-aware component and richer per-asset explanations.

## Additional Notes
- The canonical contract-like fields are now exposed in the service view model for immediate UI consistency.
- No live trading enablement introduced; simulation-only constraints remain intact.

## Follow-up Recommended
1. Promote canonical snapshot types into `packages/api-contracts` once UI/API contract freeze is requested.
2. Add decision-trace persistence linkage into DB repositories for end-to-end analyze?report?learn continuity.
3. Expand lane/signal pages to consume same canonical confidence/risk aggregates.
