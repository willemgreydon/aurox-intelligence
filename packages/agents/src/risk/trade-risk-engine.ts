import type { TradeRiskAssessment, TradeRiskInput, TradeRiskLevel } from './trade-risk-types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveRiskLevel(input: {
  volatility: number;
  liquidity: number;
  concentration: number;
  projectedExposure: number;
}): TradeRiskLevel {
  const riskScore =
    clamp(input.volatility / 0.08, 0, 1) * 0.38 +
    (1 - clamp(input.liquidity, 0, 1)) * 0.24 +
    clamp(input.concentration, 0, 1) * 0.22 +
    clamp(input.projectedExposure, 0, 1) * 0.16;

  if (riskScore >= 0.82) return 'extreme';
  if (riskScore >= 0.58) return 'high';
  if (riskScore >= 0.34) return 'medium';
  return 'low';
}

export function assessTradeRisk(input: TradeRiskInput): TradeRiskAssessment {
  const notional = Math.max(0, input.price * input.quantity);
  const safePortfolioValue = Math.max(input.portfolioValue, 1);
  const exposureImpactPercent = (notional / safePortfolioValue) * 100;
  const projectedExposure = clamp((input.existingExposure + notional) / safePortfolioValue, 0, 1.5);
  const maxPositionPercent = input.maxPositionPercent ?? 0.12;
  const maxPositionSizeSuggestion = safePortfolioValue * maxPositionPercent;
  const concentration = clamp(notional / safePortfolioValue, 0, 1);
  const riskLevel = resolveRiskLevel({
    volatility: input.volatility,
    liquidity: input.liquidity,
    concentration,
    projectedExposure,
  });

  const drawdownWarning =
    input.volatility > 0.05
      ? 'High volatility profile; projected drawdown risk is elevated.'
      : input.volatility > 0.03
        ? 'Moderate volatility; use tighter sizing and exits.'
        : null;

  const liquiditySpreadWarning =
    input.liquidity < 0.25
      ? 'Liquidity is thin with likely wide spreads.'
      : input.liquidity < 0.45
        ? 'Liquidity is moderate; avoid aggressive order sizing.'
        : null;

  const concentrationWarning =
    concentration > 0.30
      ? 'This trade would create high portfolio concentration.'
      : concentration > 0.18
        ? 'This trade materially increases concentration risk.'
        : null;

  return {
    maxPositionSizeSuggestion,
    estimatedVolatility: input.volatility,
    drawdownWarning,
    liquiditySpreadWarning,
    stopLossSuggestion: Math.max(0.0001, input.price * (1 - clamp(input.volatility * 1.65, 0.01, 0.18))),
    exposureImpactPercent,
    concentrationWarning,
    riskLevel,
  };
}
