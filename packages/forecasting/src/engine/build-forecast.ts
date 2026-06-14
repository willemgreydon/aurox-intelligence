import type { Forecast } from '@repo/api-contracts';
import type { SignalSnapshot } from '@repo/signals';

function computeScenarioWeights(
  bias: 'bullish' | 'bearish' | 'neutral',
  confidence: number,
): Forecast['scenarioWeights'] {
  const c = Math.max(0, Math.min(1, confidence));

  if (bias === 'bullish') {
    const bullish = 0.30 + c * 0.40;
    const bearish = Math.max(0.10, (1 - bullish) * 0.35);
    const base = Math.max(0, 1 - bullish - bearish);
    return { bullish, base, bearish };
  }

  if (bias === 'bearish') {
    const bearish = 0.30 + c * 0.40;
    const bullish = Math.max(0.10, (1 - bearish) * 0.35);
    const base = Math.max(0, 1 - bullish - bearish);
    return { bullish, base, bearish };
  }

  const wing = Math.max(0.15, 0.30 - c * 0.15);
  return { bullish: wing, base: Math.max(0, 1 - 2 * wing), bearish: wing };
}

// `producedAt` is passed in (never `Date.now()`/`new Date()` internally) so that
// forecasting stays a pure, deterministic package per forecasting-purity-rule.md:
// the same inputs always yield the same forecast, which makes it reproducible for
// audit and unit-testable for determinism.
export function buildForecast(assetId: string, producedAt: string): Forecast {
  return {
    assetId,
    horizon: 'short',
    directionalBias: 'neutral',
    confidenceScore: 0.5,
    scenarioSummary: 'Initial baseline scaffold forecast.',
    scenarioWeights: computeScenarioWeights('neutral', 0.5),
    keyDrivers: ['insufficient live data wired yet'],
    riskFactors: ['forecast engine not fully calibrated'],
    producedAt,
  };
}

export function buildForecastFromSignal(signal: SignalSnapshot, producedAt: string): Forecast {
  const directionalBias =
    signal.interpretation === 'bullish' ? 'bullish' : signal.interpretation === 'bearish' ? 'bearish' : 'neutral';
  const confidenceScore = Math.max(0.35, Math.min(0.9, Math.abs(signal.compositeScoreValue) + Math.min(signal.volatilityValue / 100, 0.15)));
  const scenarioSummary =
    directionalBias === 'bullish'
      ? 'Price trend and short/long moving average structure remain constructive.'
      : directionalBias === 'bearish'
        ? 'Momentum and trend structure are currently tilted to downside continuation.'
        : 'Trend structure is mixed and supports a neutral base case.';

  return {
    assetId: signal.assetId,
    horizon: 'short',
    directionalBias,
    confidenceScore,
    scenarioSummary,
    scenarioWeights: computeScenarioWeights(directionalBias, confidenceScore),
    keyDrivers: [
      `Short MA: ${signal.shortMovingAverage?.toFixed(2) ?? 'n/a'}`,
      `Long MA: ${signal.longMovingAverage?.toFixed(2) ?? 'n/a'}`,
      `Momentum: ${signal.momentumValue?.toFixed(2) ?? 'n/a'}`,
    ],
    riskFactors: [
      `Observed volatility: ${signal.volatilityValue.toFixed(2)}`,
      'Signal is based on provider-returned history and not yet persistence-backed scenario calibration.',
    ],
    producedAt,
  };
}
