# Simulation Market Workspace — Polish Audit

**Scope:** `/invest/simulation` workspace (Marktpuls ticker, portfolio metrics, holdings,
closed investments, watchlist, tradable universe, lane/action gating, quote freshness,
AI Simulation Broker Agent, simulation-only safety copy).

**Status:** Living implementation note. Section 1 (component map + root causes) is the
audit. Section 2 records the changes delivered in the "Core A–G" slice. Section 3 lists
the deferred work (density refactor, filters, responsive, full locale sweep).

**Guardrails honored:** No real brokerage execution, no real-money trading, no weakening
of simulation-only gates, no removed disclaimers, no fabricated prices, no stale-as-live
display, no raw provider errors in primary UI.

---

## 1. Component & responsibility map

### 1.1 Marktpuls ticker
| Concern | File |
|---|---|
| Marquee component | `apps/web/components/layout/market-ticker.tsx` |
| Service (3s timeout, degraded fallback) | `apps/web/server/services/market-ticker-service.ts` |
| Read model query (7 symbols, 20s revalidate) | `apps/web/server/queries/market-ticker-query.ts` |
| Mapper (observations → view model) | `apps/web/server/mappers/market-ticker-mapper.ts` |
| Provider attribution copy | `apps/web/lib/i18n/locales/de.json` → `ticker.sourceSummary` ("Aktualisierbarer Ticker-Snapshot von {{provider}}."), `en.json` equivalent. Provider is dynamic (not hardcoded Finnhub). |

### 1.2 Quote freshness
| Concern | File / symbol |
|---|---|
| Canonical state enum | `packages/api-contracts/src/market/market.ts` → `FreshnessState = 'live' \| 'delayed' \| 'cached' \| 'market_closed' \| 'stale' \| 'partial' \| 'unavailable'` |
| State computation (asset-class aware) | `apps/web/server/lib/market-data.ts` → `getFreshnessState(timestamp, assetClass)`, `getFreshnessLabel(state)` |
| Display label formatter | `apps/web/server/lib/quote-display.ts` → `formatFreshnessLabel(...)`, `getQuoteTimestamp(...)` |
| Simulation usability (tradability) | `apps/web/server/services/simulation-quote-usability.ts` → `evaluateSimulationQuoteUsability(...)` with reason codes (`LIVE_QUOTE`, `CACHED_MARKET_CLOSED`, `STALE_DURING_MARKET_HOURS`, `MISSING_PRICE`, …) and `MarketSessionState` (`open`/`closed`/`unknown`/`crypto_24_7`) |
| i18n freshness labels | `common.freshness*` keys in `de.json` / `en.json` |

### 1.3 Asset cards / watchlist / tradable universe
| Concern | File |
|---|---|
| Card shell | `apps/web/components/invest/investable-asset-card.tsx` |
| Row shell | `apps/web/components/invest/market-asset-row.tsx` |
| Ranked panel (read-only, no buy/sell) | `apps/web/components/invest/ranked-assets-panel.tsx` |
| **Buy/Sell action buttons** | `apps/web/components/invest/quick-trade-actions.tsx` |
| Inline order form | `apps/web/components/invest/simulation-action-form.tsx` |
| Prepare-ticket URL builder | `apps/web/lib/simulation-prepare-url.ts` |
| Disabled-reason resolver | `apps/web/lib/simulation-prepare.ts` → `resolveTradeDisabledReason(...)` |
| "No open position" string | `apps/web/lib/simulation-form-helpers.ts` → `buildNoOpenPositionReason(symbol)` |

### 1.4 Holdings, closed investments, portfolio metrics
| Concern | File / location |
|---|---|
| Open holdings + closed investments tables | `apps/web/app/invest/simulation/page.tsx` (`holdingsPanel`, ~L364–402) |
| Portfolio metric cards | `apps/web/app/invest/simulation/page.tsx` (~L666–689) |
| Guarded reset controls | `apps/web/components/invest/simulation-controls-card.tsx` |
| Journal / orders / transactions tables | `apps/web/components/invest/simulation-journal-table.tsx`, page tabs |

### 1.5 AI Simulation Broker Agent
| Concern | File |
|---|---|
| Panel UI | `apps/web/components/invest/ai-simulation-agent-panel.tsx` |
| Run/confirm server actions | `apps/web/server/actions/ai-simulation-agent-actions.ts` |
| Availability + provider warning | `apps/web/server/services/ai-simulation-agent-service.ts` → `checkAiSimulationAgentAvailability()` |
| Provider resolution (Anthropic primary / OpenAI fallback) | `packages/providers/src/config.ts` → `resolveAiProviderConfig()`; `apps/web/server/env/ai-agent-env.ts` |
| Error normalization (rich categories) | `apps/web/lib/simulation-error-normalizer.ts` |
| Panel-level error normalization | `apps/web/lib/simulation-form-helpers.ts` → `normalizeAgentError(message, fallback)` |

### 1.6 Existing tests covering buy/sell, quotes, market UI
- `apps/web/lib/simulation-prepare.test.ts` — prepare-href + ticket parsing.
- `apps/web/lib/simulation-form-helpers.test.ts` — `buildNoOpenPositionReason`, `normalizeAgentError`, `snapToStep`.
- `apps/web/lib/simulation-order-ticket.test.ts`, `simulation-source.test.ts`, `simulation-number-rules.test.ts`, `simulation-error-normalizer.test.ts`.
- `apps/web/server/lib/market-data.test.ts` — `getFreshnessState` (crypto never `market_closed`, equity off-hours → `market_closed`).
- `apps/web/server/services/simulation-quote-usability.test.ts` — usability reason codes.
- No render tests for `QuickTradeActions` / cards (gap).

---

## 2. Root causes

### RC-1 — Noisy "Prepare Sell" on non-held assets (Issue 6)
`quick-trade-actions.tsx` always renders the Sell button and, when `!hasSimulatedPosition`,
sets `sellDisabledReason = buildNoOpenPositionReason(symbol)` which is then rendered as a
**visible inline `.asset-card-action-note`** on every non-held card (L122–139). Technically
correct, visually loud, and repeated across the entire universe.

**Fix (chosen: quiet-disabled):** keep the disabled Sell button but move the reason out of
always-visible text into `title` + a visually-hidden `aria-describedby` description. No
loud repeated note. Reason routed through i18n.

### RC-2 — Action gating doesn't respect `actionAvailability` (Issues 7, E)
`QuickTradeActions` gated Buy only on `disabled` (read-only) + auth, never on the asset's
`actionAvailability` (`available`/`simulated`/`planned`/`unavailable`). PLANNED / unavailable
assets therefore showed enabled Buy/Sell. The card *badge* reflected availability but the
*actions* did not.

**Fix:** a central pure helper `getSimulationAssetActionState(...)` is the single source of
truth for `canPrepareBuy` / `canPrepareSell` and disabled **codes**. `planned`/`unavailable`
disable Buy; an **open position can always be sold** (exit path is never blocked by a later
availability downgrade — risk-correct).

### RC-3 — Live/stale/market-closed/partial/unavailable ambiguity (Issues 1, 2, 8)
The state model is already rich (`FreshnessState` + `evaluateSimulationQuoteUsability`), but
cards only render `formatFreshnessLabel(...)` ("Updated {state} | {age}"). There was no single
display contract exposing tone, tradability, valuation-reliability, provider, and explanation
together, so the UI couldn't consistently separate the states or warn on valuation quality.

**Fix:** a pure `buildQuoteFreshnessDisplay(...)` helper composes the existing server logic into
one display model (`state`, `label`, `shortLabel`, `tone`, `ageLabel`, `isTradableForSimulation`,
`isReliableForValuation`, `providerLabel`, `explanation`, `lastUpdatedAt`). Asset-class aware:
crypto is `live/delayed/stale` on a 24/7 clock; equities use `market_closed` for benign
off-hours staleness vs `stale` for unexpected staleness during market hours.

### RC-4 — German mojibake in AI agent labels (Issue 9)
`de.json` `simulation.agent.*` contains **literal `0x3F` (`?`) bytes** where umlauts belong
(`74 3f 67` = "t?g"). This is destructive byte loss localized to four keys (the rest of the
file has correct UTF-8 umlauts), almost certainly from a non-UTF-8 save/round-trip that
replaced non-ASCII with `?`.

**Fix:** restore correct German: `täglicher`, `Häufiger`, `ausführen`, `verfügbar`,
`Sicherheitsgründen`, `zurückgefallen`.

### RC-5 — Closed investments mislabeled "Unrealized P&L" (Issue / Step 7)
The closed-investments table reused `positionColumns`, whose last column is labeled
**Unrealized P&L**, while feeding it `position.realizedPnl`. Header said unrealized; value was
realized.

**Fix:** dedicated `closedPositionColumns` labeling the column **Realized P&L**
(`messages.simulation.realizedPnlColumn`).

### RC-6 — Provider/error exposure & resolution clarity (Issues 9, F)
Raw provider errors are already confined to a collapsed `<details>` (good). `normalizeAgentError`
maps quota/429/401/403/timeout/api-key to a safe HOLD message. The Anthropic-primary /
OpenAI-fallback mismatch is already surfaced via `providerWarning`. Primary-UI exposure is
acceptable; the remaining concrete defect was the mojibake (RC-4). Hardening kept: ensure the
safe HOLD message and "simulation only / no real orders" copy stay visible.

### RC-7 — Inconsistent, non-componentized safety copy (Issues 10, D)
"Simulation only / no real money" copy is repeated inline in several shapes with no shared
component, risking drift.

**Fix:** `SimulationBoundaryNotice` component (variants: `compact` / `inline` / `panel` /
`footer`) driven by i18n, reusable across hero, market actions, AI panel, footer.

---

## 3. Changes delivered (Core A–G slice)

See the Change Summary in the session deliverable. Files:
- `apps/web/lib/quote-freshness-display.ts` (+ test) — RC-3.
- `apps/web/lib/simulation-asset-action-state.ts` (+ test) — RC-1, RC-2.
- `apps/web/components/invest/quick-trade-actions.tsx` — quiet-disabled Sell, availability gating, i18n labels.
- `apps/web/components/invest/simulation-boundary-notice.tsx` (+ test) — RC-7.
- `apps/web/lib/i18n/locales/de.json` — RC-4 mojibake fix + new keys; `en.json` parity.
- `apps/web/app/invest/simulation/page.tsx` — RC-5 closed-position labels.
- `apps/web/app/globals.css` — `.sr-only` utility for assistive disabled reasons.

## 4. Follow-up slice delivered — Step 5 (filters / grouping / summary)
- `apps/web/lib/simulation-universe-filter.ts` (+ test) — pure filter / sort / summarize over
  lightweight universe "facts" (`search`, asset class, support status, position state,
  freshness; sort by symbol / freshness / support; summary counts).
- `apps/web/components/invest/tradable-universe-explorer.tsx` — client explorer wrapping the
  existing cards (passed as `ReactNode`): compact summary (held / watchlist / sellable /
  stale+partial / unavailable), filter chip groups, search, sort, results count (`aria-live`),
  empty-filtered state. Freshness facts come from the central `classifyQuoteFreshness`.
- `apps/web/app/invest/simulation/page.tsx` — tradable universe section now renders the
  explorer; `simulation.universe` i18n block added (en + de translated, other 10 locales carry
  English placeholders per the repo's existing convention; freshness chip labels reuse
  `dashboard.freshness*`).
- `apps/web/app/globals.css` — `.universe-explorer*` styles.

## 5. Still deferred
- Step 4 full shared-card density rewrite (3-row hierarchy) — highest blast radius (cards are
  shared by /stocks, /watchlist, /invest/simulation); deferred deliberately. The filters +
  summary deliver the bulk of the scannability win without touching the shared card internals.
- Step 6 portfolio metrics restructure (primary vs "all metrics" disclosure) — closed-position
  label fix done; the metric-grouping restructure remains.
- Step 10 responsive sticky summary / drawer filters.
- Step 11 native translation of the English-placeholder i18n keys in the 10 non-de/en locales
  (`simulation.actions`, `simulation.universe`, `home.*`).
