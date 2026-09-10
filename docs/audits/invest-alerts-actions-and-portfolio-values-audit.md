# Audit — Invest/Alerts Actions & Portfolio Value Correctness

**Date:** 2026-06-19
**Branch:** `feat/godtier-ui`
**Scope:** (A) Alerts action clickability, (B) `/invest/portfolio` zero-value bug, (C) global header "Portfolio / Invested" chips showing blanks.

---

## 1. Summary

Three distinct issues were investigated and fixed:

1. **Portfolio `0,00 $` (zero) values — root cause found and fixed.** A degraded market quote with `price = 0` was silently multiplied into market value because the fallback used `?? ` (which does not catch `0`). German-locale users saw the real zero rendered as `0,00 $`. Fixed in the single deterministic valuation path used by both `/invest/portfolio` and `/invest/simulation`.
2. **Alerts actions — markup was already correct; hardened.** Buttons are real semantic `<button>`s with handlers and no blocking CSS. The genuine defects were: (a) the shared filter-transition `isPending` disabled **every** action button during any filter navigation, and (b) a failed request produced **no feedback** (looks like "the button doesn't work"). Both fixed.
3. **Header "Portfolio / Invested" showing `—` — fixed.** The header rebuilt the entire simulation workspace just to read two numbers, easily exceeding its 2s timeout and degrading to em-dashes. Replaced with a lightweight summary query.

A **stale-build-artifact hazard** was also discovered and removed (see §6) — compiled `.js` files were committed inside `packages/db/src`, shadowing the `.ts` source at runtime (this is why the first iteration of the fix did not register in tests, and could have served stale code to the running app).

---

## 2. Root Causes

### B) Portfolio zero values (`0,00 $`)

**File:** `packages/db/src/repositories/simulated-trading-repository.ts` → `getSimulationWorkspace()`

Original valuation:

```ts
const marketPrice = effectiveMarketPrices[row.symbol] ?? null;
const effectivePrice = marketPrice ?? averageCost;   // BUG
const marketValue = roundCurrency(quantity * effectivePrice);
```

- `?? ` only falls back on `null`/`undefined`. A quote `price` of **`0`** (degraded/stale provider snapshot; `getLatestMarketQuoteSnapshots` maps price through `toNumber`, which yields `0` for empty/garbage) is **not** nullish, so `effectivePrice` became `0` → `marketValue = quantity * 0 = 0`.
- `formatUsdPrice(0, 'de', '-')` renders `0,00 $` (verified via ICU). The formatter is correct — it shows `-` for `null`/`NaN` and only shows `0,00 $` for a **genuine** finite `0`. So the value really was `0`.

**Why user-bound, not browser-bound:** the symptom depends on *which symbols a user holds* and whether their cached quote snapshot is `0`/missing. The reporter's account had healthy quotes; the other user's 2nd holding had a degraded quote. It reproduced across that user's devices (Firefox/Windows + iPhone Safari) and not on the reporter's — classic account/data-bound signature, not a rendering-engine bug. The `0,00 $` formatting simply reflects that user's German locale.

**Secondary divergence:** the quote backfill at the old line only ran when the passed price map was **completely empty**:

```ts
if (symbols.length > 0 && Object.keys(effectiveMarketPrices).length === 0) { ... }
```

`/invest/portfolio` (assetLimit 80) and `/invest/simulation` (assetLimit 140) pass *partial* maps, so a held symbol outside the smaller window got `null` → valued at cost basis on one page and at market on the other → **inconsistent values between the two pages** (the comparison the task asked for).

### A) Alerts action clickability

**Files:** `apps/web/components/alerts/alert-center-panel.tsx`, `apps/web/app/api/alerts/[id]/state/route.ts`, `apps/web/app/globals.css`

- Buttons are real `<button type="button">` with `onClick` → `setAlertState` → `POST /api/alerts/[id]/state`. No parent row link, no `stopPropagation`, no overlay, no `pointer-events:none`, no pseudo-element covering the card. **Clickability markup/CSS is sound.**
- **Real defect 1:** every action button used `disabled={isPending || runtimeOnly}`, where `isPending` is the **shared** `useTransition` state driven by the filter `<select>`/search navigation. While any filter navigation was in flight, *all* Resolve/Dismiss/Snooze/Pin buttons across every card were disabled.
- **Real defect 2:** `setAlertState` had no error handling and no loading state. A failed request (401 session expired, 5xx persistence) left the button silently doing nothing — perceived as "not clickable."
- **By-design (kept):** when alert persistence is degraded, alerts are runtime fallbacks with `runtime-` ids and actions are disabled with a visible banner ("Actions will not persist"). This is correct and unchanged.

### C) Header "Portfolio / Invested" blanks

**File:** `apps/web/components/layout/header.tsx`

The header computed its two numbers via `getSimulationOverviewDataForUser` → `getSimulationWorkspace()`, which assembles the **full** workspace (positions, closed positions, orders, transactions, snapshots, plus quote backfill). Wrapped in `withTimeout(..., 2000ms, null)` + `.catch(() => null)`, any slow/cold DB read exceeded 2s → `null` → `—`. This is a slow-path/timeout fragility, independent of the changes above.

---

## 3. What Was Changed

### Deterministic valuation (single source of truth)
`packages/db/src/repositories/simulated-trading-repository.ts`
- Added pure, exported `usableMarketPrice(value)` — a price is usable only if finite **and strictly positive**; `0`/negative/`NaN` → `null` (the trap `?? ` could not catch).
- Added pure, exported `resolvePositionValuation(quantity, averageCost, rawMarketPrice)` returning `{ marketPrice, marketValue, costBasis, unrealizedPnl }`. When no usable price: values at cost basis, `marketPrice = null`, `unrealizedPnl = 0` (honest "unknown gain", never a fabricated zero).
- `getSimulationWorkspace()` now (1) normalizes caller prices through `usableMarketPrice`, (2) backfills **every** held symbol still lacking a usable quote (not just when the map is empty) → portfolio & simulation now value identical holdings identically, and (3) uses `resolvePositionValuation`.
- Added lightweight `getSimulationPortfolioSummaryLite(userId)` (open positions + their quotes only) for the header.

### Header performance/robustness
- `apps/web/server/services/stock-simulation-service.ts`: added `getSimulationPortfolioSummaryForUser` wrapping the lite repo function.
- `apps/web/components/layout/header.tsx`: header now uses the lite summary (resolves within the 2s budget → shows real numbers, including `$0`/`0 $` for empty accounts, instead of `—`).

### Alerts hardening
`apps/web/components/alerts/alert-center-panel.tsx`
- Per-alert `pendingAlertId` (actions no longer gated on the filter transition's `isPending`).
- `setAlertState` now checks `response.ok`, surfaces typed errors (401 → session expired; other → status), and clears pending in `finally`.
- Inline `role="status"` "Updating…" and `role="alert"` error message per card.
`apps/web/app/globals.css`: token-based `.alert-card__action-status` / `.alert-card__action-error` (dark/light safe).

### Repo hygiene (enabler + hazard fix)
- Removed 23 stale committed compiled `.js` files from `packages/db/src` (build `outDir` is `dist`; these shadowed the `.ts` at runtime). Added `packages/db/.gitignore` to prevent recurrence. See §6.

---

## 4. Simulation ↔ Portfolio value source comparison

| Field | Simulation source | Portfolio source | Same now? | Was the issue | Fix |
|---|---|---|---|---|---|
| Market value | `getSimulationWorkspace` (assetLimit 140) | `getSimulationWorkspace` (assetLimit 80) | ✅ | partial quote map + `0`-price `?? ` | `resolvePositionValuation` + always-backfill |
| Market price | same | same | ✅ | `0` treated as valid | `usableMarketPrice` |
| Cost basis / quantity / avg cost | DB position row | DB position row | ✅ | n/a | unchanged |
| Header Portfolio/Invested | n/a | full workspace (timeout) | ✅ | timeout → `—` | `getSimulationPortfolioSummaryLite` |
| Currency formatting | `Intl.NumberFormat` (locale) | `formatUsdPrice` (locale) | ✅ | none (correct) | unchanged |

---

## 5. Is the cross-user bug user/cache/locale/data-shape bound?

- **User/data-bound: YES (primary).** The zero arises only for a holding whose latest quote snapshot is `0`/missing. Independent of browser/engine; reproduces across one account's devices.
- **Data-shape-bound: PARTIALLY.** Portfolio vs simulation asset-window difference produced divergent values for the same holding.
- **Locale-bound: COSMETIC ONLY.** German locale renders the real zero as `0,00 $`; locale parsing was **not** at fault (no number is parsed from a localized string anywhere in this path — values are computed server-side as numbers and formatted once via `Intl`).
- **Cache-bound: NO.** Both routes are `force-dynamic`; no `unstable_cache` on portfolio data; React `cache()` usage is request-scoped.
- **Permissions/scoping: NO.** Queries are correctly scoped by authenticated `userId` → portfolio id.

---

## 6. Stale build artifacts (important)

`packages/db/tsconfig.json` emits to `dist/`, yet 23 compiled `.js` files were committed inside `packages/db/src` (e.g. `repositories/simulated-trading-repository.js`). Extensionless relative imports resolve `.js` **before** `.ts` in Node/vitest (and risk shadowing in the bundler), so:
- the running app and tests could execute **stale** compiled code, not the `.ts` source (this is why the first test run reported the new exports as "not a function");
- new fixes could silently fail to take effect.

**Action:** `git rm` the 23 in-`src` `.js` files (all had `.ts` twins; none imported by explicit `.js` path) and added `packages/db/.gitignore` (`src/**/*.js`, `*.d.ts`, maps, `dist`). `pnpm build:web` then succeeded using the `.ts` source, confirming the removal is safe.

---

## 7. Verification

```
pnpm --filter @repo/db typecheck            PASS
pnpm --filter @repo/db test                 PASS (32 tests, incl. 11 new)
pnpm --filter @repo/web typecheck           PASS for all changed source files
                                            (only pre-existing baselines remain:
                                             auth/register/route.test.ts [CLAUDE.md §4],
                                             next.config.test.ts — both untouched)
pnpm --filter @repo/web exec vitest         server/lib/quote-display.test.ts PASS (7)
eslint (changed TS files)                    0 errors (1 pre-existing unused-var warning)
pnpm build:web                               PASS (exit 0)
```

New tests:
- `usableMarketPrice`: rejects `0`/neg/NaN/Inf/null/undefined; accepts positive.
- `resolvePositionValuation`: market-priced; `0`-quote → cost basis (regression); missing → cost basis; genuine zero only when quantity is `0`.
- `getSimulationPortfolioSummaryLite`: null when DB unconfigured; zeros when no positions; market value with quote; cost-basis fallback on `0` quote.
- `quote-display`: missing → unavailable label (not `$0.00`); genuine `0` → `$0.00`/`0,00 $`; locale formatting; percent partial vs zero.

### Manual verification checklist (recommended before merge)
- [ ] `/invest/portfolio` — populated holdings show non-zero values; a holding with a missing/zero quote shows cost-basis value (not `0,00 $`).
- [ ] `/invest/portfolio` vs `/invest/simulation` — identical market values for the same holdings.
- [ ] Header — "Portfolio"/"Invested" show numbers (incl. `$0` for a fresh account), not `—`.
- [ ] Alerts — Resolve/Dismiss/Snooze/Pin clickable via mouse and keyboard; only the in-flight card's buttons disable; a forced failure shows an inline error; degraded-persistence banner still disables actions by design.
- [ ] Dark & light mode; desktop & mobile (mobile nav metric strip uses the same snapshot).

---

## 8. Residual Risks & Follow-ups

- **Cost-basis fallback semantics:** when no usable quote exists, a position is valued at cost basis (`unrealizedPnl = 0`). This avoids a fake zero but can mask staleness. Follow-up: surface a "price unavailable / valued at cost" indicator in the UI using the existing `marketPrice === null` signal (mapper already passes it through).
- **No DOM test harness in `apps/web`:** the Alerts fixes are covered by typecheck + build + manual checks, not a render test (adding jsdom/RTL was out of scope).
- **Repo-wide stale artifacts:** only `packages/db/src` was cleaned (the package these bugs flow through). Other packages may have similar committed `.js` in `src`; recommend a separate hygiene pass.
- **Header timeout still 2s:** now comfortably sufficient for the lite query; keep as a safety cap.
