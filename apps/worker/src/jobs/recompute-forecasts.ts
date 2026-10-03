import {
  getSignalsAwaitingForecast,
  recordForecast,
} from '@repo/db';
import { buildForecastFromSignal } from '@repo/forecasting';
import { type SignalSnapshot } from '@repo/signals';

/**
 * Incremental forecast generation job.
 *
 * Finds signal_history rows that do not yet have a matching forecast on the
 * same (asset_id, generated_date), then generates and persists the forecast
 * using the same pure buildForecastFromSignal function used by the daily cron.
 *
 * Idempotent: the forecasts table has a unique index on (asset_id, generated_date)
 * so ON CONFLICT DO NOTHING prevents duplicates. Safe to run while the cron
 * also writes forecasts.
 */

const BATCH_LIMIT = 50;

export async function recomputeForecastsJob(): Promise<{
  ok: boolean;
  job: string;
  recorded: number;
  skipped: number;
  errors: number;
}> {
  const signals = await getSignalsAwaitingForecast(BATCH_LIMIT);

  let recorded = 0;
  let skipped = 0;
  let errors = 0;

  for (const signal of signals) {
    try {
      if (signal.latestPrice == null) {
        skipped++;
        continue;
      }

      // Reconstruct a SignalSnapshot-compatible object for buildForecastFromSignal.
      // volatilityValue is not stored in signal_history — use a conservative default.
      const signalSnap: SignalSnapshot = {
        name: 'composite',
        value: signal.compositeScore,
        assetId: signal.assetId,
        interpretation: signal.interpretation,
        compositeScoreValue: signal.compositeScore,
        confidenceScore: signal.confidence,
        latestPrice: signal.latestPrice,
        volatilityValue: 0.02,
        trendStrengthValue: 0,
        momentumValue: null,
        shortMovingAverage: null,
        longMovingAverage: null,
        scoreBreakdown: {
          movingAverageContrib: 0,
          momentumContrib: 0,
          trendContrib: 0,
        },
      };

      const forecast = buildForecastFromSignal(signalSnap, signal.generatedAt);
      await recordForecast({
        assetId: signal.assetId,
        symbol: signal.symbol,
        horizon: forecast.horizon,
        directionalBias: forecast.directionalBias,
        confidenceScore: forecast.confidenceScore,
        scenarioSummary: forecast.scenarioSummary,
        referencePrice: signal.latestPrice,
        generatedAt: signal.generatedAt,
      });
      recorded++;
    } catch {
      errors++;
    }
  }

  return { ok: true, job: 'recompute-forecasts', recorded, skipped, errors };
}
