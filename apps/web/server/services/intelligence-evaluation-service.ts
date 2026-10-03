import {
  getBarsForEvaluation,
  getForecastsAwaitingEvaluation,
  getSignalsAwaitingEvaluation,
  recordForecastEvaluation,
  recordSignalOutcome,
  brierScore,
  directionCorrect,
  excursions,
  forwardReturn,
  realizedDirection,
} from '@repo/db';

/**
 * Incremental outcome evaluation for matured signals and forecasts.
 *
 * Finds signal_history and forecasts rows whose horizon has elapsed but that
 * have no corresponding outcome/evaluation row yet. For each, retrieves the
 * realized price path from app.market_daily_bars and records the outcome.
 *
 * Design contracts:
 * - PIT-safe: only uses bar data that existed AFTER generated_at + horizon.
 * - Idempotent: both target tables have ON CONFLICT DO NOTHING via unique
 *   constraints on (signal_id/forecast_id, horizon_days).
 * - Bounded: processes at most BATCH_LIMIT items per call to stay within the
 *   Vercel Cron 60-second maxDuration and the worker's interval budget.
 * - Partial failure: one bad asset never aborts the whole batch — failures
 *   are collected and returned without throwing.
 */

const HORIZON_DAYS = 10; // trading sessions horizon (matches backfill default)
const HORIZON_CALENDAR_DAYS = 16; // window to search for exit bar (covers 10 sessions + weekends)
const DEADBAND = 0.0005; // ±0.05 % neutral threshold
const METHOD_VERSION = 'recompute-v1';
const BATCH_LIMIT = 50; // max items per cron invocation

export type EvaluationResult = {
  signalOutcomes: number;
  forecastEvaluations: number;
  skipped: number; // insufficient bars
  errors: { id: string; error: string }[];
};

// ── Scenario weights (mirrors buildForecastFromSignal — deterministic) ──────

function computeScenarioWeights(
  bias: 'bullish' | 'bearish' | 'neutral',
  confidence: number,
): { bullish: number; base: number; bearish: number } {
  const c = Math.max(0, Math.min(1, confidence));
  if (bias === 'bullish') {
    const bullish = 0.3 + c * 0.4;
    const bearish = Math.max(0.1, (1 - bullish) * 0.35);
    const base = Math.max(0, 1 - bullish - bearish);
    return { bullish, base, bearish };
  }
  if (bias === 'bearish') {
    const bearish = 0.3 + c * 0.4;
    const bullish = Math.max(0.1, (1 - bearish) * 0.35);
    const base = Math.max(0, 1 - bullish - bearish);
    return { bullish, base, bearish };
  }
  const wing = Math.max(0.15, 0.3 - c * 0.15);
  return { bullish: wing, base: Math.max(0, 1 - 2 * wing), bearish: wing };
}

// ── Signal evaluation ────────────────────────────────────────────────────────

async function evaluateSignals(nowIso: string): Promise<{
  evaluated: number;
  skipped: number;
  errors: { id: string; error: string }[];
}> {
  const signals = await getSignalsAwaitingEvaluation(HORIZON_DAYS, BATCH_LIMIT);
  let evaluated = 0;
  let skipped = 0;
  const errors: { id: string; error: string }[] = [];

  for (const signal of signals) {
    try {
      if (signal.latestPrice == null || signal.latestPrice <= 0) {
        skipped++;
        continue;
      }
      const fromDate = signal.generatedAt.substring(0, 10);
      const toDate = offsetDate(fromDate, HORIZON_CALENDAR_DAYS);
      const bars = await getBarsForEvaluation(signal.symbol, fromDate, toDate);

      // Need at least HORIZON_DAYS bars after the generation date to evaluate.
      // Skip (do not record "insufficient_data") rather than polluting the table —
      // the item will be retried on the next cron run once more bars arrive.
      if (bars.length < HORIZON_DAYS) {
        skipped++;
        continue;
      }

      const entryPrice = signal.latestPrice;
      const exitBar = bars[Math.min(HORIZON_DAYS - 1, bars.length - 1)]!;
      const exitPrice = exitBar.close;
      const windowCloses = bars.slice(0, HORIZON_DAYS).map((b) => b.close);

      const ret = forwardReturn(entryPrice, exitPrice);
      const realized = realizedDirection(ret, DEADBAND);
      const { mfe, mae } = excursions(entryPrice, windowCloses);

      await recordSignalOutcome({
        signalId: signal.id,
        assetId: signal.assetId,
        symbol: signal.symbol,
        signalGeneratedAt: signal.generatedAt,
        horizonDays: HORIZON_DAYS,
        evaluatedAt: nowIso,
        entryPrice,
        exitPrice,
        forwardReturn: ret,
        mfe,
        mae,
        predictedDirection: signal.interpretation,
        realizedDirection: realized,
        directionCorrect: directionCorrect(signal.interpretation, realized),
        signalScore: signal.compositeScore,
        signalConfidence: signal.confidence,
        methodVersion: METHOD_VERSION,
      });
      evaluated++;
    } catch (err) {
      errors.push({ id: signal.id, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { evaluated, skipped, errors };
}

// ── Forecast evaluation ──────────────────────────────────────────────────────

async function evaluateForecasts(nowIso: string): Promise<{
  evaluated: number;
  skipped: number;
  errors: { id: string; error: string }[];
}> {
  const forecasts = await getForecastsAwaitingEvaluation(HORIZON_DAYS, BATCH_LIMIT);
  let evaluated = 0;
  let skipped = 0;
  const errors: { id: string; error: string }[] = [];

  for (const forecast of forecasts) {
    try {
      if (forecast.referencePrice == null || forecast.referencePrice <= 0) {
        skipped++;
        continue;
      }
      if (!forecast.symbol) {
        skipped++;
        continue;
      }
      const fromDate = forecast.generatedAt.substring(0, 10);
      const toDate = offsetDate(fromDate, HORIZON_CALENDAR_DAYS);
      const bars = await getBarsForEvaluation(forecast.symbol, fromDate, toDate);

      if (bars.length < HORIZON_DAYS) {
        skipped++;
        continue;
      }

      const referencePrice = forecast.referencePrice;
      const exitBar = bars[Math.min(HORIZON_DAYS - 1, bars.length - 1)]!;
      const realizedPrice = exitBar.close;
      const ret = forwardReturn(referencePrice, realizedPrice);
      const realized = realizedDirection(ret, DEADBAND);
      const weights = computeScenarioWeights(forecast.directionalBias, forecast.confidenceScore);
      const brier = brierScore(weights, realized);

      await recordForecastEvaluation({
        forecastId: forecast.id,
        assetId: forecast.assetId,
        symbol: forecast.symbol,
        producedAt: forecast.generatedAt,
        horizon: forecast.horizon,
        horizonDays: HORIZON_DAYS,
        evaluatedAt: nowIso,
        referencePrice,
        realizedPrice,
        forwardReturn: ret,
        directionalBias: forecast.directionalBias,
        realizedDirection: realized,
        directionCorrect: directionCorrect(forecast.directionalBias, realized),
        brierScore: brier,
        scenarioWeights: weights,
        confidenceScore: forecast.confidenceScore,
        methodVersion: METHOD_VERSION,
      });
      evaluated++;
    } catch (err) {
      errors.push({ id: forecast.id, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { evaluated, skipped, errors };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluate matured signals and forecasts in a single bounded pass.
 * Safe to call multiple times — idempotent via ON CONFLICT DO NOTHING.
 */
export async function evaluateMatureEvidence(
  nowIso: string = new Date().toISOString(),
): Promise<EvaluationResult> {
  const [sigResult, fctResult] = await Promise.all([
    evaluateSignals(nowIso),
    evaluateForecasts(nowIso),
  ]);
  return {
    signalOutcomes: sigResult.evaluated,
    forecastEvaluations: fctResult.evaluated,
    skipped: sigResult.skipped + fctResult.skipped,
    errors: [...sigResult.errors, ...fctResult.errors],
  };
}

// ── Utility ──────────────────────────────────────────────────────────────────

/** Offset an ISO date string by N calendar days (no dependency on Date.now). */
function offsetDate(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().substring(0, 10);
}
