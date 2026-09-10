# `@repo/api-contracts` — Shared Contracts Reference

> Source: [`packages/api-contracts/src`](../../packages/api-contracts/src)
> Status: **CURRENT** unless explicitly marked FUTURE.

## 1. Purpose & Boundary

`@repo/api-contracts` is the **single source of truth** for all shared Zod schemas and
inferred TypeScript types. Any type used by more than one package must originate here.

Boundary rules (see [`api-contracts-boundary.md`](../../.claude/rules/api-contracts-boundary.md)):

- Zod schema first; the TypeScript type is `z.infer<typeof schema>`.
- `packages/db`, `packages/signals`, `packages/forecasting`, `packages/agents`, and
  `apps/web` all consume these inferred types — they must not fork or redefine them.
- Route-specific *view models* may live in `apps/web/server/mappers/`, but the underlying
  domain types come from here.

Every export is surfaced through [`src/index.ts`](../../packages/api-contracts/src/index.ts).

## 2. Directory Map

The package is organised into ~18 domain folders. Each folder typically holds a single
`*.ts` module (plus compiled `*.js`/`*.d.ts`).

| Folder | Module | Responsibility |
| --- | --- | --- |
| [`account/`](../../packages/api-contracts/src/account) | `account.ts` | Auth users, sessions, login/register/profile/password inputs, account overview. |
| [`admin/`](../../packages/api-contracts/src/admin) | `admin.ts` | Provider monitoring & admin config. |
| [`ai-agent/`](../../packages/api-contracts/src/ai-agent) | `ai-simulation-agent.ts` | Simulation-only AI agent decisions, proposed orders, autonomy modes, caps. |
| [`assets/`](../../packages/api-contracts/src/assets) | `asset.ts` | Canonical asset + asset metadata. |
| [`dashboard/`](../../packages/api-contracts/src/dashboard) | `dashboard.ts` | Operational dashboard read models, modules, system status. |
| [`forecasts/`](../../packages/api-contracts/src/forecasts) | `forecast.ts` | Forecast contract (bias, confidence, scenario weights). |
| [`fx/`](../../packages/api-contracts/src/fx) | `fx.ts` | FX overview + detail previews. |
| [`ingestion/`](../../packages/api-contracts/src/ingestion) | `ingestion-run.ts` | Ingestion run lifecycle state. |
| [`intelligence/`](../../packages/api-contracts/src/intelligence) | `market-intelligence.ts`, `claude-finance.ts` | Market insight summaries, provenance, risk flags; Claude-finance cockpit view models. |
| [`invest/`](../../packages/api-contracts/src/invest) | `invest.ts` | Investable assets, recommendations, connected accounts, capabilities. |
| [`macro/`](../../packages/api-contracts/src/macro) | `macro.ts` | Macro series/points, regime signals, provider IDs, freshness. |
| [`market/`](../../packages/api-contracts/src/market) | `market.ts`, `market-stream.ts` | Market ticker/state; **streaming event contracts** (tick/trade/orderbook/funding/liquidation). |
| [`news/`](../../packages/api-contracts/src/news) | `news.ts` | News items, provider health, impact traces, normalized articles, snapshots. |
| [`ranking/`](../../packages/api-contracts/src/ranking) | `ranking.ts` | Asset rankings + ranking recommendations. |
| [`signals/`](../../packages/api-contracts/src/signals) | `signals.ts` | Signal summary contract. |
| [`simulation/`](../../packages/api-contracts/src/simulation) | `simulation.ts` | Simulation accounts, orders, positions, transactions, snapshots, lanes, sessions, execution records. |
| [`stocks/`](../../packages/api-contracts/src/stocks) | `stocks.ts` | Stocks overview + detail previews. |
| [`workspace/`](../../packages/api-contracts/src/workspace) | `preferences.ts` | Locale, chart controls/types, dashboard presets, broker modes. |

## 3. Schema Catalog (key exports per domain)

Exports below are the principal schemas/types; each schema has a matching
`z.infer` type (e.g. `simulationOrderSchema` → `SimulationOrder`).

| Domain | Key schemas | Key inferred types |
| --- | --- | --- |
| account | `accountUserSchema`, `authSessionSchema`, `authenticatedSessionSchema`, `loginInputSchema`, `registerInputSchema`, `profileUpdateInputSchema`, `passwordChangeInputSchema`, `accountOverviewSchema` | `AccountUser`, `AuthSession`, `AuthenticatedSession`, `LoginInput`, `RegisterInput`, `AccountOverview` |
| assets | `assetSchema`, `canonicalAssetMetadataSchema` | `Asset`, `CanonicalAssetMetadata` |
| ranking | `rankingRecommendationSchema`, `assetRankingSchema`, `rankedAssetListSchema` | `RankingRecommendation`, `AssetRanking`, `RankedAssetList` |
| market | `tickerItemSchema`, `marketTickerSchema`, `freshnessStateSchema`, `routeStatusSchema`, `trendDirectionSchema`, `sentimentStateSchema` | `TickerItem`, `MarketTicker`, `FreshnessState`, `RouteStatus`, `TrendDirection`, `SentimentState` |
| market-stream | `marketTickSchema`, `tradeEventSchema`, `orderBookUpdateSchema`, `fundingRateEventSchema`, `liquidationEventSchema` | `MarketTick`, `TradeEvent`, `OrderBookUpdate`, `FundingRateEvent`, `LiquidationEvent` |
| signals | `signalSummarySchema` | `SignalSummary` |
| simulation | `simulationOrderSchema`, `simulationPositionSchema`, `simulationTransactionSchema`, `simulationSnapshotSchema`, `simulationAccountSummarySchema`, `simulationExecutionRecordSchema`, `simulationExecutionInputSchema`, `simulationSessionSchema`, `microTradingGuardrailsSchema` | `SimulationOrder`, `SimulationPosition`, `SimulationTransaction`, `SimulationSnapshot`, `SimulationExecutionRecord`, `SimulationOrderErrorCode` |
| forecasts | `forecastSchema` | `Forecast` |
| macro | `macroSeriesSchema`, `macroSeriesPointSchema`, `macroRegimeSignalSchema` | `MacroSeries`, `MacroSeriesPoint`, `MacroRegimeSignal`, `MacroProviderId`, `MacroFreshnessState` |
| news | `newsItemSchema`, `newsArticleNormalizedSchema`, `newsIntelligenceSnapshotSchema`, `newsImpactTraceSchema` | `NewsItem`, `NewsArticleNormalized`, `NewsIntelligenceSnapshot`, `NewsImpactExplanation` |
| intelligence | `marketInsightSummarySchema`, `marketIntelligenceDigestSchema` | `MarketInsightSummary`, `InsightFactor`, `RiskFlag`, `InsightProvenance`, `ClaudeFinanceCockpitViewModel` |
| invest | `investableAssetSummarySchema`, `investmentRecommendationSchema`, `connectedInvestmentAccountSchema` | `InvestableAssetSummary`, `InvestmentRecommendation`, `ConnectedInvestmentAccount`, `RecommendationAction`, `ActionAvailability` |
| ingestion | `ingestionRunSchema` | `IngestionRun` |
| ai-agent | `aiSimulationAgentRequestSchema`, `aiSimulationProposedOrderSchema`, `aiSimulationAgentDecisionSchema`, `aiSimulationAgentResultSchema` | `AiSimulationAgentRequest`, `AiSimulationProposedOrder`, `AiSimulationAgentDecision`, `AiSimulationAutonomyMode` |
| dashboard | `dashboardSnapshotSchema`, `dashboardModuleSchema`, `dashboardSystemStatusSchema` | `DashboardSnapshot`, `DashboardModule`, `DashboardSystemStatus` |
| workspace | `chartControlsSchema`, `normalizedChartSchema`, `dashboardPresetSchema` | `Locale`, `ChartType`, `TimePeriod`, `BrokerMode`, `DashboardPreset` |
| stocks / fx | `stocksOverviewSchema`, `fxOverviewSchema` | `StocksOverview`, `StockDetailPreview`, `FxOverview`, `FxDetailPreview` |
| admin | `adminMonitoringSchema`, `monitoredProviderConfigSchema` | `AdminMonitoring`, `MonitoredProviderConfig` |

## 4. Key Contract Shapes

### Forecast — [`forecasts/forecast.ts`](../../packages/api-contracts/src/forecasts/forecast.ts)

```ts
export const forecastSchema = z.object({
  assetId: z.string(),
  horizon: z.enum(['short', 'medium', 'long']),
  directionalBias: z.enum(['bullish', 'bearish', 'neutral']),
  confidenceScore: z.number().min(0).max(1),
  scenarioSummary: z.string(),
  scenarioWeights: z.object({
    bullish: z.number().min(0).max(1),
    base: z.number().min(0).max(1),
    bearish: z.number().min(0).max(1),
  }),
  // ...
});
export type Forecast = z.infer<typeof forecastSchema>;
```

`confidenceScore` is bounded `[0, 1]` at the schema level — honoring the
[confidence-score rule](../../.claude/rules/confidence-score-rule.md).

### MarketTick — [`market/market-stream.ts`](../../packages/api-contracts/src/market/market-stream.ts)

```ts
export const marketTickSchema = z.object({
  provider: z.string().min(1),
  symbol: z.string().min(1),
  normalizedSymbol: z.string().min(1),
  assetClass: marketStreamAssetClassSchema,
  price: z.number(),
  bid: z.number().nullable(),
  ask: z.number().nullable(),
  volume24h: z.number().nullable(),
  change24h: z.number().nullable(),
  eventTime: z.string(),
  receivedAt: z.string(),
  latencyMs: z.number().int().min(0).nullable(),
  // ...
});
```

Every streaming event carries `provider`, `normalizedSymbol`, and explicit timestamps
(`eventTime` / `receivedAt`) for traceability and freshness.

> **Note:** the canonical REST `MarketQuote` and `HistoricalBar` shapes are owned by
> [`@repo/providers`](./providers.md), not this package — they are transport types, not
> shared domain contracts.

## 5. Invariants & Rules

- **Zod-first.** Bounded numerics (`min`/`max`) are enforced in schemas (e.g.
  confidence/scenario weights `[0,1]`).
- **No duplication.** A shared type lives here exactly once; consumers import
  `z.infer` types. Local re-declaration is forbidden.
- **Discriminated unions** for execution/risk/order states (e.g. `simulationOrderStatusSchema`,
  `marketStreamAssetClassSchema`, `NormalizedMarketStreamEvent` in
  [`@repo/ingestion`](./ingestion.md) reuses these classes).
- **Inputs vs read models.** `*InputSchema` schemas validate write-path payloads;
  read-model schemas describe display-ready data.
- **Explainability fields.** Insight/recommendation/forecast contracts include explanation
  / factors / risk fields (see [explainability rule](../../.claude/rules/explainability-rule.md)).

## 6. Failure Modes

This package is pure type + schema definition — it performs **no I/O**. Failure surfaces
at the call site: `schema.parse()` throws `ZodError` on malformed input; consumers use
`safeParse()` at boundaries (server actions, repository writes) and reject invalid data
before any side effect.

## 7. How to Extend — Add a Contract

1. Pick (or create) the right domain folder under
   [`src/`](../../packages/api-contracts/src).
2. Define the Zod schema; export both the schema and `export type X = z.infer<typeof xSchema>`.
3. Re-export from [`src/index.ts`](../../packages/api-contracts/src/index.ts).
4. Consume the inferred type in `db` / `signals` / `agents` / `apps/web`.
5. Typecheck:

   ```bash
   pnpm --filter @repo/api-contracts typecheck
   ```

## 8. Environment Variables

This package has **no environment configuration** — it is pure contracts. Provider keys,
`DATABASE_URL`, etc. belong to [`@repo/providers`](./providers.md) and
[`@repo/db`](./db.md).

## Related Docs

- [`@repo/db` reference](./db.md) · [`@repo/providers` reference](./providers.md) · [`@repo/ingestion` reference](./ingestion.md)
- [Market Data Provider Architecture](../market-data-provider-architecture.md)
