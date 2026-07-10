# `packages/ai-market-intelligence`

The intelligence composition layer. It does **not** fetch data and does **not** execute
trades. It consumes already-derived signals, factors, news, macro series, and risk inputs
and composes them into **explainable, confidence-bearing** recommendations, rankings,
system orchestration state, and portfolio intelligence.

Package name: `@repo/ai-market-intelligence`. ESM, builds with `tsc`, tests with `vitest`.

## Purpose & Boundary

- **Owns:** recommendation composition, cross-asset ranking, system orchestration,
  macro-regime modelling, news-impact explanation, and portfolio intelligence.
- **Consumes:** `@repo/api-contracts` (all shared types) and `@repo/signals` (pure
  indicator helpers: `momentum`, `movingAverage`, `volatility`).
- **Must not:** call providers or the DB, execute orders, or enable live trading. Every
  output is augmentation for a human or a simulation workflow — never authority.

```text
signals + factors + news + macro + risk inputs
        │ (passed in as contract-typed data)
        ▼
ai-market-intelligence  ──▶  Recommendation / AssetRanking / SystemState / PortfolioIntelligenceResult
        │                         (each carries explanation + confidence)
        ▼
apps/web mappers/services  ──▶  read models  ──▶  UI
```

Dependencies are declared in `package.json`: `@repo/api-contracts`, `@repo/signals`.
There is intentionally **no** dependency on `@repo/db`, `@repo/providers`,
`@repo/agents`, or `@repo/forecasting`.

## Directory Map

| Path | Responsibility |
|---|---|
| `src/index.ts` | Public barrel. Re-exports engines + two convenience derivers (`deriveMarketInsight`, `deriveInvestmentRecommendation`). |
| `src/recommendation/recommendation-engine.ts` | Core deterministic recommendation engine: `computeRecommendation`. Defines the engine `Recommendation` contract. |
| `src/recommendation/recommendation-explainer.ts` | `buildRecommendationExplanation` — turns a `Recommendation`'s drivers into prose. |
| `src/ranking-engine.ts` | Cross-asset ranking: `rankAssets` + composite-score/risk-penalty/confidence helpers. |
| `src/orchestration/system-orchestrator.ts` | `orchestrateSystemState` — aggregates many assets into a system-level view (top opportunities, high-risk, avoided, provider/news risk summaries, readiness). |
| `src/macro/regime-engine.ts` | `computeMacroRegimeModel` — derives a macro regime from `MacroSeries`. |
| `src/news/news-impact.ts` | `deriveNewsImpactExplanation` — sentiment/recency/source-weighted news impact + risk flag. |
| `src/news/news-intelligence-extractor.ts` | `extractNewsIntelligenceSnapshot`, `buildContentHash` — structured news snapshot extraction. |
| `src/portfolio/portfolio-intelligence-engine.ts` | `computePortfolioIntelligence` — allocations, rebalance plan, diagnostics, regime awareness, risk alerts. |
| `src/__tests__/` | Vitest suites for each engine (recommendation, ranking, macro regime, news impact, news extractor, portfolio). |

## Public API

| Export | Kind | Signature (abridged) |
|---|---|---|
| `computeRecommendation` | fn | `(input: EngineRecommendationInput) => Recommendation` |
| `buildRecommendationExplanation` | fn | `(rec: Recommendation) => string` |
| `deriveMarketInsight` | fn | `(input: IntelligenceInput) => MarketInsightSummary` |
| `deriveMarketIntelligenceDigest` | fn | `(title, inputs: IntelligenceInput[], freshness) => MarketIntelligenceDigest` |
| `deriveInvestmentRecommendation` | fn | `(input: RecommendationInput) => InvestmentRecommendation` |
| `rankAssets` | fn | `(inputs: AssetRankingInput[]) => AssetRanking[]` (api-contracts shape) |
| `computeCompositeScore` | fn | `(c: CompositeScoreComponents) => number` (clamped −1..1) |
| `computeRiskPenalty` | fn | `(f: RiskPenaltyFactors) => number` (clamped 0..0.75) |
| `computeRankingConfidence` | fn | `(input, signalScore, factorScore) => number` (0.15..0.90) |
| `mapRankingRecommendation` | fn | `(score: number) => RankingRecommendation` |
| `orchestrateSystemState` | fn | `({ assets, providerHealth, degraded }) => SystemState` |
| `computeMacroRegimeModel` | fn | `(series: MacroSeries[]) => MacroRegimeModel` |
| `deriveNewsImpactExplanation` | fn | `(symbol, news: NewsItem[]) => NewsImpactExplanation` |
| `extractNewsIntelligenceSnapshot` | fn | `(input) => NewsIntelligenceSnapshot` |
| `buildContentHash` | fn | `(article) => string` |
| `computePortfolioIntelligence` | fn | `(input: PortfolioIntelligenceInput) => PortfolioIntelligenceResult` |
| `Recommendation`, `RecommendationAction`, `RecommendationHorizon`, `RecommendationRiskLevel`, `EngineRecommendationInput` | types | engine recommendation contract |
| `SystemState`, `AssetState`, `AssetOrchestrationInput` | types | orchestration contract |
| `AssetRankingInput`, `CompositeScoreComponents`, `RiskPenaltyFactors` | types | ranking contract |

## Contracts

### Three distinct recommendation vocabularies (important)

This package speaks **three** different action vocabularies. They are not
interchangeable — keep them straight when mapping to UI read models.

| Vocabulary | Source | Values |
|---|---|---|
| Engine `RecommendationAction` | `recommendation-engine.ts` | `STRONG_BUY`, `BUY`, `HOLD`, `REDUCE`, `SELL`, `STRONG_SELL`, `AVOID` |
| `RankingRecommendation` | `@repo/api-contracts` (ranking) | `strong_buy`, `buy`, `hold`, `sell`, `strong_sell` |
| Invest `RecommendationAction` | `@repo/api-contracts` (invest) | `accumulate`, `hold`, `watch`, `trim`, `avoid` |

`computeRecommendation` / `orchestrateSystemState` / `computePortfolioIntelligence`
use the **engine** vocabulary. `rankAssets` emits the **ranking** vocabulary.
`deriveInvestmentRecommendation` emits the **invest** vocabulary.

### Engine `Recommendation` (the core contract)

```ts
type Recommendation = {
  action: RecommendationAction;            // STRONG_BUY..AVOID
  confidence: number;                      // 0..1, honestly derived
  horizon: RecommendationHorizon;          // INTRADAY | SWING | POSITION | LONG_TERM
  riskLevel: RecommendationRiskLevel;      // LOW | MEDIUM | HIGH | EXTREME
  positionSizingSuggestion: number;        // 0..1; 0 when AVOID
  simulationAllowed: boolean;              // false when EXTREME / CRITICAL news
  liveAllowed: false;                      // LITERAL false — never true here
  reasoning: {
    signalDrivers: string[];
    newsDrivers: string[];
    riskDrivers: string[];
    uncertaintyNotes: string[];
  };
  explanationText: string;                 // human-readable; set by orchestrator/explainer
  scoreBreakdown: {
    signalScore: number;                   // normalized 0..1
    newsScore: number;
    riskPenalty: number;
    finalScore: number;
  };
};
```

### How composition works

`computeRecommendation` is a pure deterministic function of `EngineRecommendationInput`:

1. **Normalize inputs** — signal score `(signalScore + 1) / 2`; news, risk penalty,
   and liquidity adjustment each clamped to `0..1`.
2. **Weighted final score** — `signal*0.5 + news*0.2 − riskPenalty*0.2 + liquidity*0.1`,
   clamped to `0..1`.
3. **Map to action** by score band, then **downgrade** one step when risk is `HIGH` or
   news risk is `HIGH`; force `AVOID` when risk is `EXTREME` or news risk is `CRITICAL`.
4. **Confidence** from trend/momentum magnitude, `(1 − riskPenalty)`, and liquidity;
   reduced by `0.18` when provider/data is degraded (with an uncertainty note).
5. **Position sizing** scales with `finalScore * (1 − riskPenalty)`, halved under HIGH
   risk, and forced to `0` on `AVOID`.

`rankAssets` composes a `CompositeScoreComponents` blend
(signal 0.35, factor 0.25, regime 0.15, risk-adjusted momentum 0.15, liquidity 0.10),
applies a `RiskPenalty` (volatility 0.30, liquidity 0.25, drawdown 0.20, correlation
0.15, anomaly 0.10; capped at 0.75), then `finalScore = composite * (1 − riskPenalty)`,
sorts descending (ties broken by confidence), and assigns ranks. It prefers a
historical-OHLCV model (≥ 20 closes via `@repo/signals`) and falls back to quote-only
scoring with a freshness discount.

`orchestrateSystemState` runs `computeRecommendation` per asset, attaches
`buildRecommendationExplanation`, and aggregates into `topOpportunities` (STRONG_BUY/BUY
sorted by finalScore, top 10), `highRiskAssets`, `avoidedAssets`, provider/news risk
summaries, and a `readinessState` that always reports `liveReady: false`.

## Invariants

- **Explainability is mandatory.** Every recommendation, ranking item, macro signal, and
  orchestration result carries human-readable text (`explanationText` / `explanation` /
  `reasoning` / `signalSummary` etc.). No silent scores.
  ([explainability-rule.md](../../.claude/rules/explainability-rule.md))
- **Confidence is honestly derived, never hardcoded high.** Confidence drops on degraded
  providers, stale/partial freshness, and sparse history; ranking confidence is capped at
  `0.35` when data is stale/unavailable and at `0.20` when critical data is missing.
  ([confidence-score-rule.md](../../.claude/rules/confidence-score-rule.md))
- **AI is augmentation, not authority.** `liveAllowed` is the literal type `false` on
  `Recommendation`, `AssetState`, `SystemState.readinessState`, and
  `PortfolioIntelligenceResult`. This package cannot enable live execution.
- **Simulation-first gating.** `simulationAllowed` is set to `false` on EXTREME risk /
  CRITICAL news; high risk adds a "manual confirmation required" uncertainty note.
- **Determinism.** Engines are pure given their inputs. The only non-deterministic calls
  are timestamp generation (`new Date().toISOString()` in `rankAssets`, `regime-engine`,
  `deriveMarketInsight`) used for provenance, not for scoring. Scores never use randomness.
- **No fabricated data.** Missing inputs degrade confidence and produce explicit
  insufficient-data explanations rather than invented scores.

## Failure Modes

| Condition | Behavior |
|---|---|
| Provider/data degraded | Confidence reduced by `0.18`; `uncertaintyNotes` records the cause; orchestrator marks `degraded: true`. |
| Stale / unavailable freshness | Ranking confidence capped at `0.35`; `deriveMarketInsight` raises the truthfulness risk flag to `high`. |
| Missing critical data (no change + stale/unavailable) | `rankAssets` returns a `hold` item with `confidence: 0.20` and an "insufficient data" explanation. |
| EXTREME risk / CRITICAL news | Action forced to `AVOID`; `positionSizingSuggestion: 0`; `simulationAllowed: false`. |
| Empty asset list | `orchestrateSystemState` returns empty arrays, `simulationReady: false`, `systemRiskLevel: 'LOW'`; digest reports an empty-state message. |
| No news attached | `deriveMarketInsight` adds a MEDIUM "news coverage" risk flag; impact stays quote-weighted. |

These are **graceful degradation** paths, not crashes — consistent with the no-fake-data
and confidence rules.

## How to Extend

1. **New input signal/factor:** add the field to `EngineRecommendationInput` (or the
   relevant `*Input` type) and the corresponding shared contract in
   `@repo/api-contracts` if it crosses package lines. Never fork a contract locally.
2. **Wire it into the blend:** adjust the weighted formula in `computeRecommendation`
   (or `computeCompositeScore` / `computeRiskPenalty`). Keep weights summing sensibly and
   keep outputs clamped.
3. **Explain it:** push a driver string into `signalDrivers` / `newsDrivers` /
   `riskDrivers` so the explainer can surface it. Outputs without explanations violate
   the explainability rule.
4. **Confidence:** if the new input affects reliability, fold it into the confidence
   derivation — do not hardcode a higher confidence.
5. **Keep purity:** no provider/DB calls; pass external data in as already-typed inputs.
6. **Test deterministically** with fixed fixtures (below) and assert exact score/action.

## Testing Notes

- Run: `pnpm --filter @repo/ai-market-intelligence test` and
  `pnpm --filter @repo/ai-market-intelligence typecheck`.
- Suites live in `src/__tests__/`: `recommendation-engine.test.ts`,
  `ranking-engine.test.ts`, `macro-regime-engine.test.ts`, `news-impact.test.ts`,
  `news-intelligence-extractor.test.ts`, `portfolio-intelligence-engine.test.ts`.
- Use **fixed** inputs and assert exact actions/scores — engines are deterministic, so
  random fixtures are forbidden ([test-data-rule.md](../../.claude/rules/test-data-rule.md)).
- Cover the safety boundaries explicitly: `AVOID` forcing on EXTREME/CRITICAL,
  `simulationAllowed: false` paths, degraded-confidence reduction, and missing-critical-data
  fallbacks.

## Current vs Future

| Capability | Status |
|---|---|
| Heuristic recommendation/ranking/macro/news engines | Current |
| `liveAllowed` | Permanently `false` in this package; live gating lives in `@repo/agents` |
| Forecasting integration | Future — forecast bias is currently passed in as data, not by importing `@repo/forecasting` |
| LLM/model-backed explanations | Future — `provenance.modelMode` is currently `'heuristic'` |

## Related

- [`docs/signal-framework.md`](../signal-framework.md), [`docs/factor-models.md`](../factor-models.md), [`docs/portfolio-construction.md`](../portfolio-construction.md)
- [`docs/ai-in-finance.md`](../ai-in-finance.md), [`docs/anomaly-detection.md`](../anomaly-detection.md)
- Rules: [`explainability-rule.md`](../../.claude/rules/explainability-rule.md), [`confidence-score-rule.md`](../../.claude/rules/confidence-score-rule.md), [`insufficient-data-rule.md`](../../.claude/rules/insufficient-data-rule.md)
