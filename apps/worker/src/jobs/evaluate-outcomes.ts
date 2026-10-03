import {
  brierScore,
  directionCorrect,
  excursions,
  forwardReturn,
  getBarsForEvaluation,
  getForecastsAwaitingEvaluation,
  getSignalsAwaitingEvaluation,
  realizedDirection,
  recordForecastEvaluation,
  recordSignalOutcome,
} from '@repo/db';

/**
 * Incremental outcome evaluation job.
 *
 * Evaluates matured signals and forecasts using the same logic as the Vercel
 * Cron path (intelligence-evaluation-service), calling @repo/db building blocks
 * directly so the worker has no dependency on apps/web.
 *
 * Idempotent: both target tables use ON CONFLICT DO NOTHING via unique
 * constraints on (signal_id/forecast_id, horizon_days).
 */

const HORIZON_DAYS = 10;
const HORIZON_CALENDAR_DAYS = 16;
const DEADBAND = 0.0005;
const METHOD_VERSION = 'worker-evaluate-v1';
const BATCH_LIMIT = 50;

function offsetDate(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().substring(0, 10);
}

function computeScenarioWeights(
  bias: 'bullish' | 'bearish' | 'neutral',
  confidence: number,
): { bullish: number; base: number; bearish: number } {
  const c = Math.max(0, Math.min(1, confidence));
  if (bias === 'bullish') {
    const bullish = 0.3 + c * 0.4;
    const bearish = Math.max(0.1, (1 - bullish) * 0.35);
    return { bullish, base: Math.max(0, 1 - bullish - bearish), bearish };
  }
  if (bias === 'bearish') {
    const bearish = 0.3 + c * 0.4;
    const bullish = Math.max(0.1, (1 - bearish) * 0.35);
    return { bullish, base: Math.max(0, 1 - bullish - bearish), bearish };
  }
  const wing = Math.max(0.15, 0.3 - c * 0.15);
  return { bullish: wing, base: Math.max(0, 1 - 2 * wing), bearish: wing };
}

export async function evaluateOutcomesJob(): Promise<{
  ok: boolean;
  job: string;
  signalOutcomes: number;
  forecastEvaluations: number;
  skipped: number;
  errors: number;
}> {
  const nowIso = new Date().toISOString();
  let signalOutcomes = 0;
  let forecastEvaluations = 0;
  let skipped = 0;
  let errors = 0;

  // ── Evaluate matured signals ──────────────────────────────────────────────
  const signals = await getSignalsAwaitingEvaluation(HORIZON_DAYS, BATCH_LIMIT);
  for (const signal of signals) {
    try {
      if (signal.latestPrice == null || signal.latestPrice <= 0) { skipped++; continue; }
      const fromDate = signal.generatedAt.substring(0, 10);
      const bars = await getBarsForEvaluation(signal.symbol, fromDate, offsetDate(fromDate, HORIZON_CALENDAR_DAYS));
      if (bars.length < HORIZON_DAYS) { skipped++; continue; }

      const entryPrice = signal.latestPrice;
      const exitPrice = bars[Math.min(HORIZON_DAYS - 1, bars.length - 1)]!.close;
      const windowCloses = bars.slice(0, HORIZON_DAYS).map((b: { close: number }) => b.close);
      const ret = forwardReturn(entryPrice, exitPrice);
      const realized = realizedDirection(ret, DEADBAND);
      const { mfe, mae } = excursions(entryPrice, windowCloses);

      await recordSignalOutcome({
        signalId: signal.id, assetId: signal.assetId, symbol: signal.symbol,
        signalGeneratedAt: signal.generatedAt, horizonDays: HORIZON_DAYS,
        evaluatedAt: nowIso, entryPrice, exitPrice, forwardReturn: ret, mfe, mae,
        predictedDirection: signal.interpretation, realizedDirection: realized,
        directionCorrect: directionCorrect(signal.interpretation, realized),
        signalScore: signal.compositeScore, signalConfidence: signal.confidence,
        methodVersion: METHOD_VERSION,
      });
      signalOutcomes++;
    } catch { errors++; }
  }

  // ── Evaluate matured forecasts ────────────────────────────────────────────
  const forecasts = await getForecastsAwaitingEvaluation(HORIZON_DAYS, BATCH_LIMIT);
  for (const forecast of forecasts) {
    try {
      if (forecast.referencePrice == null || !forecast.symbol) { skipped++; continue; }
      const fromDate = forecast.generatedAt.substring(0, 10);
      const bars = await getBarsForEvaluation(forecast.symbol, fromDate, offsetDate(fromDate, HORIZON_CALENDAR_DAYS));
      if (bars.length < HORIZON_DAYS) { skipped++; continue; }

      const referencePrice = forecast.referencePrice;
      const realizedPrice = bars[Math.min(HORIZON_DAYS - 1, bars.length - 1)]!.close;
      const ret = forwardReturn(referencePrice, realizedPrice);
      const realized = realizedDirection(ret, DEADBAND);
      const weights = computeScenarioWeights(forecast.directionalBias, forecast.confidenceScore);

      await recordForecastEvaluation({
        forecastId: forecast.id, assetId: forecast.assetId, symbol: forecast.symbol,
        producedAt: forecast.generatedAt, horizon: forecast.horizon, horizonDays: HORIZON_DAYS,
        evaluatedAt: nowIso, referencePrice, realizedPrice, forwardReturn: ret,
        directionalBias: forecast.directionalBias, realizedDirection: realized,
        directionCorrect: directionCorrect(forecast.directionalBias, realized),
        brierScore: brierScore(weights, realized), scenarioWeights: weights,
        confidenceScore: forecast.confidenceScore, methodVersion: METHOD_VERSION,
      });
      forecastEvaluations++;
    } catch { errors++; }
  }

  return { ok: true, job: 'evaluate-outcomes', signalOutcomes, forecastEvaluations, skipped, errors };
}
