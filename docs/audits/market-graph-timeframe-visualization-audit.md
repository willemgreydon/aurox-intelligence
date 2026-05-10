# Market Graph Timeframe Visualization Audit
Date: 2026-05-09
Agent: aurox-charting-engineer
Scope: apps/web/components/charts/market-graph-workspace.tsx,
       apps/web/lib/market-graph-timeframes.ts,
       apps/web/server/services/market-graph-service.ts

## Root Causes Found

### 1. X-axis "00:00" labels on 1m / 1h timeframes
Root cause: `MARKET_GRAPH_TIMEFRAMES['1m'].xAxisFormat = 'time'` and `['1h'].xAxisFormat = 'time'`.
The `formatAxisTimestamp` with format 'time' produces HH:mm. All available daily bars
have UTC-midnight timestamps (2026-05-09T00:00:00.000Z), so every label renders as "00:00".

The workspace blindly used `timeframeConfig.xAxisFormat` even when the bars in hand were
daily rather than intraday.

Fix: Added `getAxisFormatForVisibleBars(timeframe, bars)` to market-graph-timeframes.ts.
It detects actual bar spacing: if bars are >= 6 hours apart it overrides the format to 'date'
regardless of what the timeframe config says. This produces "May 9" style labels for daily
bars shown on an intraday timeframe.

### 2. Intraday fallback detection was tied to server meta, not the current timeframe
Root cause: `usingDegradedInterval` was computed as `isIntradayTimeframe && (meta?.isFallback ?? false)`.
`meta.isFallback` is set server-side for the timeframe the server was called with (typically '1D' on
initial page load). If the user clicks '1m' client-side, `meta.isFallback` still reflects the
server's initial timeframe and may be wrong.

Fix: Replaced with a client-side `visibleIsDailyFallback` useMemo that inspects bar spacing
of the `visible` array directly, mirroring the same 6-hour threshold used in `sliceBarsForTimeframe`.

### 3. Meta point count chip showed server count, not current slice count
Root cause: The advanced panel chip used `meta?.pointCount` which reflects the server slice at
initial load timeframe, not the current client-selected timeframe.

Fix: Added `visibleMeta` useMemo in the workspace that derives pointCount, actualStart,
actualEnd, and coverageRatio from the current `visible` array. Advanced panel now shows
`visibleMeta.pointCount`.

### 4. X-axis tick generation produced duplicate labels
Root cause: The original x-axis tick generation interpolated ratio x (length-1), so ticks
could land on adjacent bars with the same month label for 1Y/2Y, and did not deduplicate.

Fix: Added `computeAxisTicks(bars, xAxisFormat, targetCount)` to market-graph-timeframes.ts.
It picks evenly spaced indices (step = floor(length / targetCount)), always adds the last bar,
then deduplicates by rendered label. Returns { index, timestamp, label }[].

### 5. 1Y/2Y timeframe switching
The previous session's fix to send full allBars from the server and slice client-side was
already correct in the workspace `visible` useMemo. Re-inspection confirms clicking 1Y/2Y
changes `visible` correctly if the server sent enough bars (730 bars for 2Y). The degraded
overlay is shown correctly when coverage is < 75%.

## Files Changed

### apps/web/lib/market-graph-timeframes.ts
- Added `getAxisFormatForVisibleBars(selectedTimeframe, bars)` -- detects effective x-axis
  format based on actual bar spacing, overrides 'time' to 'date' for daily bars
- Added `computeAxisTicks(bars, xAxisFormat, targetCount)` -- evenly-spaced, deduplicated
  tick set with index, timestamp, and label fields
- Both functions exported for tests and workspace use

### apps/web/components/charts/market-graph-workspace.tsx
- Imported `getAxisFormatForVisibleBars` and `computeAxisTicks`
- Replaced `usingDegradedInterval` computation: now client-side bar spacing check via
  `visibleIsDailyFallback` useMemo instead of `meta?.isFallback`
- Added `effectiveXAxisFormat` useMemo: calls `getAxisFormatForVisibleBars(timeframe, visible)`
- Added `visibleMeta` useMemo: derives pointCount/actualStart/actualEnd/coverageRatio from
  current visible slice
- Replaced x-axis tick computation: uses `computeAxisTicks(viewportVisible, effectiveXAxisFormat, 6)`
- Updated hover crosshair x-label: uses `effectiveXAxisFormat` instead of `timeframeConfig.xAxisFormat`
- Updated advanced panel chip: uses `visibleMeta.pointCount` instead of `meta?.pointCount`
- Updated timeframe pill point count: uses `visibleMeta.pointCount`

### apps/web/lib/market-graph-timeframes.test.ts
- Added import of `getAxisFormatForVisibleBars` and `computeAxisTicks`
- Added `getAxisFormatForVisibleBars` test suite (8 tests)
- Added `computeAxisTicks` test suite (7 tests)
- 56 total tests, all passing

## Validation Results

Checks run:
- npx vitest run lib/market-graph-timeframes.test.ts: PASS (56 tests)
- npx vitest run server/services/market-graph-service.test.ts: PASS (13 tests)
- pnpm --filter @repo/api-contracts typecheck: PASS
- npx tsc --noEmit --project apps/web/tsconfig.json: PASS

Checks not run:
- pnpm build:web (no changes to server routes or Next.js build config)
- packages/db, packages/signals, packages/agents (not changed)

Known unrelated baseline failures:
- apps/web/server/auth/service.test.ts: pre-existing typing issue (CLAUDE.md section 4)

## Manual QA Notes

Expected behavior after fix:
- 1m / 1h with daily bars: x-axis labels show "May 9", "May 6" etc. (date format),
  not "00:00". Degraded badge still shown correctly because visibleIsDailyFallback is true.
- 1Y click: visible slice to last bar - 365 days, then downsampled to ~252 points.
  Chart path updates because visible changes (it is in useMemo([selected, timeframe])).
  X-axis shows "Jun 2025", "Aug 2025" etc. (month format, deduplicated).
- 2Y click: visible slice to last bar - 730 days, downsampled to ~504 points.
  If server only sent 365 bars (1 year of history), coverage < 75% and degraded badge shows.
- Compare series: uses the same timeframe and per-asset last-bar anchor. Already correct.

Data availability constraint:
If the provider/DB only has 90 days of history:
- 1Y will show "Only 3 months of 12-month history available" degraded badge
- 2Y will show "Only 1.5 months of 24-month history available" degraded badge
- This is expected and correct -- no fabrication.

## Remaining TODOs

1. If the provider eventually supplies real 1m/1h bars, getAxisFormatForVisibleBars will
   automatically return 'time' for genuine intraday spacing. No code change needed.

2. Server timeframe propagation: currently the server is called once with an initial timeframe.
   If the user switches to 2Y client-side and the DB only had 90 days when the server was
   called, the full 2Y history is not available. A follow-up option is a client-side fetch
   trigger when the user selects a timeframe with visibleMeta.coverageRatio < 0.75.

3. Candles mode with many bars: in candle view with viewportVisible.length > 200, wicks
   overlap visually. A future improvement could reduce tick count automatically.
