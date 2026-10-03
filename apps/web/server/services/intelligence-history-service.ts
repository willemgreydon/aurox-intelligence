import {
  getInvestmentUniverse,
  getMarketHistoryBarsBySymbols,
  recordForecast,
  recordSignalSnapshots,
  type ForecastRecord,
  type SignalSnapshotRecord,
} from '@repo/db';
import { buildForecastFromSignal } from '@repo/forecasting';
import { deriveSignalSnapshot } from '@repo/signals';

/**
 * Records a daily deterministic signal snapshot AND matching forecast for the
 * tradable universe, so that forward returns can later be attributed to what
 * the system actually knew at each point in time.
 *
 * Both writes are idempotent (ON CONFLICT DO NOTHING via uq_signal_history_asset_date
 * and uq_forecasts_asset_date added in migration 0027) — re-running on the same
 * day produces no new rows.
 *
 * Runs from the daily Vercel Cron at 07:00 UTC. Degrades gracefully without a DB.
 */

const MAX_ASSETS = 60;
const HISTORY_BARS = 90;
const MIN_BARS = 20;

export async function recordUniverseSignalHistory(
  nowIso: string = new Date().toISOString(),
): Promise<{ recorded: number; forecastsRecorded: number; considered: number }> {
  const universe = await getInvestmentUniverse().catch(() => []);
  const selected = universe.filter((asset) => asset.isSimulated).slice(0, MAX_ASSETS);
  if (selected.length === 0) {
    return { recorded: 0, forecastsRecorded: 0, considered: 0 };
  }

  const symbols = selected.map((asset) => asset.symbol);
  const barsBySymbol = await getMarketHistoryBarsBySymbols(symbols, HISTORY_BARS).catch(
    () => ({}) as Record<string, never[]>,
  );

  const signalRecords: SignalSnapshotRecord[] = [];
  const forecastRecords: Array<{ record: ForecastRecord; latestPrice: number | null }> = [];

  for (const asset of selected) {
    const bars = barsBySymbol[asset.symbol] ?? [];
    if (bars.length < MIN_BARS) continue;

    const signal = deriveSignalSnapshot(
      asset.assetId,
      bars.map((bar) => bar.close),
    );

    signalRecords.push({
      assetId: asset.assetId,
      symbol: asset.symbol,
      assetClass: asset.assetClass,
      interpretation: signal.interpretation,
      compositeScore: signal.compositeScoreValue,
      confidence: signal.confidenceScore,
      latestPrice: signal.latestPrice,
      generatedAt: nowIso,
    });

    // Build a forecast from the same signal so signal+forecast are always co-dated.
    const forecast = buildForecastFromSignal(signal, nowIso);
    forecastRecords.push({
      record: {
        assetId: asset.assetId,
        symbol: asset.symbol,
        horizon: forecast.horizon,
        directionalBias: forecast.directionalBias,
        confidenceScore: forecast.confidenceScore,
        scenarioSummary: forecast.scenarioSummary,
        referencePrice: signal.latestPrice ?? null,
        generatedAt: nowIso,
      },
      latestPrice: signal.latestPrice ?? null,
    });
  }

  if (signalRecords.length > 0) {
    await recordSignalSnapshots(signalRecords);
  }

  // Persist forecasts individually (recordForecast already degrades on FK/schema errors).
  let forecastsRecorded = 0;
  for (const { record } of forecastRecords) {
    try {
      await recordForecast(record);
      forecastsRecorded++;
    } catch {
      // Best-effort: a failed forecast never blocks the signal record.
    }
  }

  return {
    recorded: signalRecords.length,
    forecastsRecorded,
    considered: selected.length,
  };
}
