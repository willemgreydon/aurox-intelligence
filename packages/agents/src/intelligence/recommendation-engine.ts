import type {
  MarketRegime,
  RecommendationAction,
  RecommendationInput,
  RecommendationResult,
  RecommendationHorizon,
} from './recommendation-types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveHorizon(assetClass: RecommendationInput['assetClass'], volatility: number): RecommendationHorizon {
  if (volatility > 0.045) {
    return 'intraday';
  }
  if (assetClass === 'crypto' || volatility > 0.02) {
    return 'swing';
  }
  return 'long-term';
}

function regimeAdjustment(regime: MarketRegime | undefined): number {
  if (regime === 'risk_on') return 0.08;
  if (regime === 'risk_off') return -0.10;
  if (regime === 'volatile') return -0.06;
  return 0;
}

function resolveRecommendation(score: number): RecommendationAction {
  if (score >= 0.42) return 'buy';
  if (score >= 0.12) return 'hold';
  if (score <= -0.35) return 'avoid';
  if (score <= -0.12) return 'reduce';
  return 'watch';
}

export function computeDeterministicRecommendation(input: RecommendationInput): RecommendationResult {
  const normalizedSignal = clamp(input.signalScore, -1, 1);
  const normalizedFactor = clamp(input.factorScore, -1, 1);
  const normalizedRisk = clamp(input.riskScore, 0, 1);
  const normalizedVolatilityPenalty = clamp(input.volatility / 0.08, 0, 1);
  const normalizedLiquidityBoost = clamp(input.liquidity, 0, 1);

  const composite = clamp(
    normalizedSignal * 0.42 +
      normalizedFactor * 0.20 +
      normalizedLiquidityBoost * 0.08 +
      regimeAdjustment(input.marketRegime) -
      normalizedRisk * 0.22 -
      normalizedVolatilityPenalty * 0.08,
    -1,
    1,
  );

  const recommendation = resolveRecommendation(composite);
  const confidence = clamp(
    0.28 +
      Math.abs(normalizedSignal) * 0.30 +
      Math.abs(normalizedFactor) * 0.10 +
      input.signalConfidence * 0.20 +
      normalizedLiquidityBoost * 0.08 -
      normalizedRisk * 0.12,
    0.2,
    0.95,
  );

  const rationale = [
    `Signal contribution ${normalizedSignal.toFixed(2)} and factor contribution ${normalizedFactor.toFixed(2)}.`,
    `Risk score ${normalizedRisk.toFixed(2)} with volatility ${input.volatility.toFixed(3)} and liquidity ${normalizedLiquidityBoost.toFixed(2)}.`,
    `Composite decision score ${composite.toFixed(2)} mapped to ${recommendation.toUpperCase()}.`,
  ];

  const riskWarnings: string[] = [];
  if (input.volatility > 0.04) {
    riskWarnings.push('Elevated volatility detected; tighten stop-loss discipline.');
  }
  if (normalizedLiquidityBoost < 0.35) {
    riskWarnings.push('Liquidity is thin; avoid oversized entries and exits.');
  }
  if (normalizedRisk > 0.65) {
    riskWarnings.push('Portfolio risk overlay is elevated; reduce gross exposure.');
  }

  return {
    recommendation,
    confidence,
    rationale,
    riskWarnings,
    horizon: resolveHorizon(input.assetClass, input.volatility),
    mode: 'deterministic',
  };
}
