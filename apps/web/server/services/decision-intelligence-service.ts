import { recommendationService, assessTradeRisk, computeNewsImpact } from '@repo/agents';
import type { NewsItem } from '@repo/api-contracts';
import { deriveSignalSnapshot } from '@repo/signals';

export type SignalLabel = 'Strong Bearish' | 'Bearish' | 'Neutral' | 'Bullish' | 'Strong Bullish';
export type SignalVisualState = 'bullish' | 'neutral' | 'bearish' | 'insufficient-data';

export type AssetDecisionIntelligence = {
  signal: {
    score: number;
    label: SignalLabel;
    visualState: SignalVisualState;
    confidence: number;
    explanation: string;
    contributingIndicators: string[];
  };
  recommendation: {
    value: 'Buy' | 'Watch' | 'Hold' | 'Avoid' | 'Reduce';
    confidence: number;
    rationale: string[];
    riskWarnings: string[];
    horizon: 'intraday' | 'swing' | 'long-term';
    mode: 'deterministic' | 'ai-assisted';
  };
  risk: {
    label: 'Low' | 'Medium' | 'High' | 'Extreme';
    exposureImpactPercent: number;
    stopLossSuggestion: number;
    drawdownWarning: string | null;
    liquidityWarning: string | null;
    concentrationWarning: string | null;
  };
  newsInfluence?: {
    sentimentAdjustment: number;
    confidenceAdjustment: number;
    riskAdjustment: number;
    explanation: string[];
  };
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapSignalLabel(score: number): SignalLabel {
  if (score <= -0.65) return 'Strong Bearish';
  if (score <= -0.2) return 'Bearish';
  if (score >= 0.65) return 'Strong Bullish';
  if (score >= 0.2) return 'Bullish';
  return 'Neutral';
}

function mapSignalVisualState(score: number): SignalVisualState {
  if (score <= -0.2) return 'bearish';
  if (score >= 0.2) return 'bullish';
  return 'neutral';
}

function mapRecommendation(value: 'buy' | 'watch' | 'hold' | 'avoid' | 'reduce') {
  if (value === 'buy') return 'Buy';
  if (value === 'watch') return 'Watch';
  if (value === 'avoid') return 'Avoid';
  if (value === 'reduce') return 'Reduce';
  return 'Hold';
}

function mapRiskLabel(value: 'low' | 'medium' | 'high' | 'extreme') {
  if (value === 'low') return 'Low' as const;
  if (value === 'medium') return 'Medium' as const;
  if (value === 'high') return 'High' as const;
  return 'Extreme' as const;
}

export function deriveAssetDecisionIntelligence(input: {
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  history: number[];
  latestPrice: number | null;
  dayMovePercent: number | null;
  portfolioValue?: number;
  quantity?: number;
  existingExposure?: number;
  recentNews?: NewsItem[];
}): AssetDecisionIntelligence {
  const finiteHistory = input.history.filter((value) => Number.isFinite(value) && value > 0);
  const hasInsufficientHistory = finiteHistory.length < 5;
  const normalizedPrice = input.latestPrice ?? finiteHistory.at(-1) ?? 0;
  const signalSnapshot =
    finiteHistory.length >= 2
      ? deriveSignalSnapshot(input.symbol, finiteHistory)
      : deriveSignalSnapshot(input.symbol, [normalizedPrice || 1, normalizedPrice || 1]);

  const score = clamp(signalSnapshot.compositeScoreValue, -1, 1);
  const volatility = Math.max(0.001, signalSnapshot.volatilityValue);
  const liquidity = input.assetClass === 'crypto' ? 0.45 : input.assetClass === 'etf' ? 0.62 : 0.74;
  const factorScore = clamp((input.dayMovePercent ?? 0) / 8, -1, 1);

  const recommendation = recommendationService.evaluate({
    symbol: input.symbol,
    assetClass: input.assetClass,
    signalScore: score,
    signalConfidence: signalSnapshot.confidenceScore,
    factorScore,
    riskScore: clamp(volatility / 0.08, 0, 1),
    volatility,
    liquidity,
    marketRegime: score > 0.1 ? 'risk_on' : score < -0.1 ? 'risk_off' : 'transitional',
  });
  const newsImpact = computeNewsImpact({
    assetId: input.symbol,
    symbol: input.symbol,
    recentNews: input.recentNews ?? [],
  });
  const adjustedConfidence = clamp(
    recommendation.confidence + newsImpact.confidenceAdjustment,
    0,
    1,
  );

  const risk = assessTradeRisk({
    symbol: input.symbol,
    assetClass: input.assetClass,
    price: normalizedPrice > 0 ? normalizedPrice : 1,
    quantity: Math.max(1, input.quantity ?? 1),
    portfolioValue: Math.max(1000, input.portfolioValue ?? 100000),
    existingExposure: Math.max(0, input.existingExposure ?? 0),
    volatility,
    liquidity,
  });

  return {
    signal: {
      score,
      label: mapSignalLabel(score),
      visualState: hasInsufficientHistory ? 'insufficient-data' : mapSignalVisualState(score),
      confidence: signalSnapshot.confidenceScore,
      explanation: hasInsufficientHistory
        ? 'Insufficient history for high-confidence signal classification. Treat as watch-only until more bars are available.'
        : score > 0.1
          ? 'Momentum and trend are aligned to the upside.'
          : score < -0.1
            ? 'Momentum and trend are aligned to the downside.'
            : 'Signal stack is mixed and does not justify directional conviction.',
      contributingIndicators: hasInsufficientHistory
        ? []
        : [
            `MA spread ${signalSnapshot.scoreBreakdown.movingAverageContrib.toFixed(3)}`,
            `Momentum ${signalSnapshot.scoreBreakdown.momentumContrib.toFixed(3)}`,
            `Trend ${signalSnapshot.scoreBreakdown.trendContrib.toFixed(3)}`,
          ],
    },
    recommendation: {
      value: mapRecommendation(recommendation.recommendation),
      confidence: adjustedConfidence,
      rationale: [...recommendation.rationale],
      riskWarnings: [...recommendation.riskWarnings],
      horizon: recommendation.horizon,
      mode: recommendation.mode,
    },
    risk: {
      label: mapRiskLabel(risk.riskLevel),
      exposureImpactPercent: risk.exposureImpactPercent,
      stopLossSuggestion: risk.stopLossSuggestion,
      drawdownWarning: risk.drawdownWarning,
      liquidityWarning: risk.liquiditySpreadWarning,
      concentrationWarning: risk.concentrationWarning,
    },
    newsInfluence: {
      sentimentAdjustment: newsImpact.sentimentAdjustment,
      confidenceAdjustment: newsImpact.confidenceAdjustment,
      riskAdjustment: newsImpact.riskAdjustment,
      explanation: newsImpact.explanation,
    },
  };
}
