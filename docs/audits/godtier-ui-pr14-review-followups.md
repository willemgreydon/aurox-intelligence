# GODTIER UI — PR #14 Review Follow-ups

Source: code review of `feat/godtier-ui` → `main` (PR #14), 2026-06-19.
Status legend: `[ ]` open · `[~]` in progress · `[x]` done.
Each task lists the file(s), the defect, the fix, and acceptance criteria. Respect the
package boundaries and verification rules in [`.claude/rules/`](../../.claude/rules/).

---

## Batch A — Simulation accounting & valuation integrity (do first)

- [x] **A1 · 🔴 Non-transactional account creation on the header render path**
  - Files: [`packages/db/src/repositories/simulated-trading-repository.ts:369`](../../packages/db/src/repositories/simulated-trading-repository.ts#L369), `:1181`; [`apps/web/components/layout/header.tsx:42`](../../apps/web/components/layout/header.tsx#L42)
  - Defect: `ensureSimulationAccount` does 4 sequential `client.execute` INSERTs with no transaction; reached from `getSimulationPortfolioSummaryLite` under `withTimeout` → a timeout mid-sequence leaves a partial, audit-inconsistent account.
  - Fix: wrap the create path in `client.transaction(...)`; do not create accounts from a render/timeout path — ensure eagerly at signup and have the lite read treat "no account" as a clean empty state.
  - AC: first-time-user load never persists a partial account; new repo test asserts atomic create (all-or-nothing); `pnpm --filter @repo/db test` green. Rules: [repository-transaction-rule](../../.claude/rules/repository-transaction-rule.md), [simulation-auditability-rule](../../.claude/rules/simulation-auditability-rule.md).

- [x] **A2 · 🟠 Cost-basis fallback shown as a live valuation (no staleness flag)**
  - Files: `simulated-trading-repository.ts` `resolvePositionValuation` (~`:1062`); [`apps/web/server/mappers/portfolio-mapper.ts:102`](../../apps/web/server/mappers/portfolio-mapper.ts#L102); [`apps/web/components/layout/header.tsx:43`](../../apps/web/components/layout/header.tsx#L43)
  - Defect: missing quote → `marketValue = costBasis`, `unrealizedPnl = 0`, no degraded flag. Portfolio reads as "flat/breakeven" during a provider outage.
  - Fix: carry `pricedFromCostBasis`/`isStale` through the valuation read model; surface a staleness indicator + an aggregate "N of M priced from cost basis" cue in header + `/invest`.
  - AC: a position with no usable quote renders a visible "price unavailable / stale" state, not `$0.00` P&L; mapper test covers the degraded branch. Rules: [no-fake-market-data](../../.claude/rules/no-fake-market-data.md), [quote-snapshot-rule](../../.claude/rules/quote-snapshot-rule.md).

## Batch B — Intelligence display correctness

- [ ] **B1 · 🟠 `MiniSparkline` ignores `signalScore` (AUR-066 no-op)**
  - Files: [`apps/web/components/charts/mini-sparkline.tsx:59`](../../apps/web/components/charts/mini-sparkline.tsx#L59); caller [`apps/web/app/markets/rankings/page.tsx:191`](../../apps/web/app/markets/rankings/page.tsx#L191)
  - Defect: `signalScore?`/`showMovingAverage?` declared in props but not destructured/used; trend inferred from price series instead of signal.
  - Fix: consume `signalScore` to drive `resolvedTrend`/color, OR remove the prop and document sparkline as price-only.
  - AC: a bearish-signal/price-up row renders the signal-colored sparkline (or the prop is gone). `pnpm build:web` green.

- [ ] **B2 · 🟠 Macro "insufficient data" branch is dead code (false precision)**
  - Files: [`apps/web/server/lib/macro-regime-engine.ts:48`](../../apps/web/server/lib/macro-regime-engine.ts#L48); [`apps/web/components/macro/macro-regime-card.tsx:47`](../../apps/web/components/macro/macro-regime-card.tsx#L47); [`apps/web/components/macro/macro-risk-overlay.tsx`](../../apps/web/components/macro/macro-risk-overlay.tsx)
  - Defect: confidence is `clamp(..., 0.2, 0.95)` (floored 0.2), so `hasData = confidence > 0` is always true; empty macro series still render a precise score + meter.
  - Fix: pass a real coverage signal (e.g. `seriesWithPoints` count) and gate the degraded state on `seriesWithPoints === 0` (or a low-coverage threshold).
  - AC: empty/sparse macro input renders the "Insufficient macro data" state in both cards. Rules: [insufficient-data-rule](../../.claude/rules/insufficient-data-rule.md), [confidence-score-rule](../../.claude/rules/confidence-score-rule.md).

- [ ] **B3 · 🟡 Forecast confidence bar hidden (not degraded) when score absent**
  - Files: [`apps/web/components/dashboard/forecast-summary-card.tsx:17`](../../apps/web/components/dashboard/forecast-summary-card.tsx#L17)
  - Defect: when `confidenceScore` is absent the bar is omitted but the bias glyph/badge stays prominent → a confident-looking call with no uncertainty cue.
  - Fix: render an explicit "confidence unknown" state instead of hiding the bar.
  - AC: missing-confidence forecast shows an unknown-confidence indicator. Rule: [signal-visual-state-rule](../../.claude/rules/signal-visual-state-rule.md).

## Batch C — Robustness / config

- [ ] **C1 · 🟠 Worker scheduler: no NaN guard on env delays**
  - File: [`apps/worker/src/schedulers/scheduler.ts:56`](../../apps/worker/src/schedulers/scheduler.ts#L56) (and `:62`)
  - Defect: `Number(process.env.WORKER_INITIAL_DELAY_MS ?? 20_000)` → `NaN` on malformed override → `setTimeout(NaN)`→0 → all jobs fire at boot (thundering herd).
  - Fix: `const n = Number(...); X = Number.isFinite(n) && n >= 0 ? n : DEFAULT` + a warn log on invalid override (mirror the existing `DB_POOL_MAX` guard).
  - AC: malformed env falls back to default with a warning; unit test for the parser.

- [ ] **C2 · 🟡 DB pool `max` 1→10 assumes a pooler endpoint, unenforced**
  - File: [`packages/db/src/client.ts:65`](../../packages/db/src/client.ts#L65) (and `:75`)
  - Defect: `max: 10` is only safe on the Neon `-pooler`/PgBouncer endpoint; on a direct URL (dev/CI/self-host) render fan-out can exhaust connections.
  - Fix: detect `-pooler`/`pgbouncer` in the URL and cap `max` to 1 otherwise (or make pool size an explicit env with a sane default).
  - AC: direct-endpoint URL resolves to `max: 1`; pooler URL keeps `max: 10`; unit test on the resolver.

- [ ] **C3 · 🟡 Rankings `volatilityProxy` becomes `NaN` on non-finite `changePercent`**
  - File: [`apps/web/app/markets/rankings/page.tsx:66`](../../apps/web/app/markets/rankings/page.tsx#L66)
  - Defect: `?? 0` guards null/undefined but not `NaN` → `Math.max(0.001, NaN)=NaN` → `Vol NaN`.
  - Fix: `Number.isFinite(asset.changePercent) ? Math.abs(asset.changePercent)/100 : 0`.
  - AC: `NaN`/`Infinity` changePercent renders a finite proxy.

## Batch D — UI polish / interaction

- [ ] **D1 · 🟡 `--header-height` CSS var never assigned**
  - Files: [`apps/web/components/ui/section.tsx:14`](../../apps/web/components/ui/section.tsx#L14); [`apps/web/components/invest/simulation-section-nav.tsx`](../../apps/web/components/invest/simulation-section-nav.tsx); [`apps/web/app/globals.css`](../../apps/web/app/globals.css)
  - Defect: `var(--header-height, 3.5rem)` is read but the var is never set → anchor scroll offset always uses the fallback.
  - Fix: assign `--header-height` on the header/root element (or hard-code the real height).
  - AC: section-nav anchor jumps land the heading clear of the sticky header at all breakpoints.

- [ ] **D2 · 🟡 Position-size caution computed in client component, fees excluded**
  - File: [`apps/web/components/invest/simulation-action-form.tsx:218`](../../apps/web/components/invest/simulation-action-form.tsx#L218) (and `:227`)
  - Defect: `(estimatedGross / availableCashUsd) * 100` derived in a `'use client'` form; `estimatedGross` excludes fees → caution can read <100% on an order the server rejects; financial ratio in a component.
  - Fix: compute the ratio (fees included) in the mapper/service, pass it as a read-model field; component just renders it.
  - AC: ratio comes from the read model; includes fees. Rules: [position-sizing-rule](../../.claude/rules/position-sizing-rule.md), [aurox-ui-boundaries](../../.claude/rules/aurox-ui-boundaries.md).

- [ ] **D3 · 🟡 Alert action buttons enabled during filter transition → possible double-POST**
  - File: [`apps/web/components/alerts/alert-center-panel.tsx:59`](../../apps/web/components/alerts/alert-center-panel.tsx#L59) (and `:76`, `:85`)
  - Defect: actions gated on `pendingAlertId` not `isPending`; `finally` clears pending before `router.refresh()` repaints → fast double-click can fire a second POST against an already-actioned alert.
  - Fix: `await router.refresh()` before clearing pending; ignore actions whose alert id is no longer in `model`.
  - AC: a second click during/after an action on the same alert is a no-op.

## Batch E — Cleanup (optional, low priority)

- [ ] **E1 · Extract one shared `signedTone`/glyph helper.** `toneFor`/`TONE_META` (macro cards), `dirTone`/`dirGlyph` (rankings), `BIAS_GLYPH` (forecast card), `toneForDelta` (portfolio) are 4+ copies of signed-score→tone→arrow with differing thresholds. Centralize in `apps/web/server/lib` (or a mapper) and import.
- [ ] **E2 · Dedup confidence→percent→CSS-var formatting** shared between `forecast-summary-card.tsx` and `markets/rankings/page.tsx`.

---

## Batch F — Surfaced by the docs pass (separate from PR #14, optional)

- [ ] **F1 · Observability barrel gap.** [`packages/observability/src/index.ts`](../../packages/observability/src/index.ts) re-exports only `logger` + `tracing`; `recordMetric` (`metrics.ts`) and `normalizeError` (`errors/normalize-error.ts`) exist but aren't surfaced. Add `export * from './metrics'` and `export * from './errors/normalize-error'`.
- [ ] **F2 · No persisted/workflow-wired global halt.** `resolveExecutionGate` exists but `runUnifiedTradeWorkflow` doesn't consult it (`it.todo` in the workflow test). Persist `GovernanceState`, add an `emergency-halt` action + `get/setExecutionHaltState`, wire the check into the workflow, then assert it in a test. Rules: [kill-switch-rule](../../.claude/rules/kill-switch-rule.md). **(High-risk domain — plan before editing.)**
- [ ] **F3 · Backfill `-- Rollback:` comments** into migrations `0001`–`0015` (they predate the rule). Rule: [rollback-notes-rule](../../.claude/rules/rollback-notes-rule.md).
- [ ] **F4 · Two `0006`-prefixed migrations** (`account_preference_expansion`, `provider_market_extensions`) rely on lexical ordering. Confirm intended order or renumber.

---

## Verification gate (run before pushing any batch)

```bash
# per changed package
pnpm --filter @repo/db typecheck && pnpm --filter @repo/db test
pnpm --filter @repo/agents typecheck && pnpm --filter @repo/agents test
pnpm build:web            # any apps/web change
pnpm --filter @repo/worker typecheck   # scheduler change
pnpm lint
```
Known baseline (not a regression): `apps/web/server/auth/service.test.ts` typing issue (CLAUDE.md §4).
Do not weaken risk gates, enable live execution, or fabricate market data. Simulation-first.
