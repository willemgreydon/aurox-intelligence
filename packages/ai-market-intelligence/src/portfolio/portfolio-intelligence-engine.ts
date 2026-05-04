import type { Recommendation, RecommendationAction } from '../recommendation/recommendation-engine';

export type AllocationAction = 'INCREASE' | 'DECREASE' | 'HOLD' | 'ENTER' | 'EXIT' | 'MONITOR';

export type PortfolioAllocation = {
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'other';
  currentWeight: number;
  targetWeight: number;
  deltaWeight: number;
  suggestedAction: AllocationAction;
  priorityScore: number;
  reasoning: string;
  recommendationAction: RecommendationAction;
  confidence: number;
  riskLevel: string;
};

export type RebalanceTrade = {
  symbol: string;
  side: 'buy' | 'sell';
  targetWeightDelta: number;
  estimatedNotionalPct: number;
  reasoning: string;
};

export type PortfolioRiskAlert = {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  symbol?: string;
  message: string;
  detail: string;
};

export type PortfolioSummary = {
  totalWeight: number;
  diversificationScore: number;
  concentrationRisk: string;
  dominantAssetClass: string;
  simulationOnlyNotice: string;
  explanation: string;
};

export type PortfolioIntelligenceResult = {
  allocations: PortfolioAllocation[];
  portfolioSummary: PortfolioSummary;
  rebalancePlan: RebalanceTrade[];
  riskAlerts: PortfolioRiskAlert[];
  explanation: string;
  simulationOnly: true;
  liveAllowed: false;
  generatedAt: number;
};

export type PortfolioIntelligenceInput = {
  recommendations: Array<{
    symbol: string;
    assetClass?: 'stock' | 'etf' | 'crypto' | 'other';
    recommendation: Recommendation;
    currentWeight?: number;
  }>;
  constraints?: {
    maxPositionWeight?: number;
    minPositionWeight?: number;
    maxCryptoWeight?: number;
    maxSingleSectorWeight?: number;
    rebalanceThreshold?: number;
  };
  degraded?: boolean;
  generatedAt?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mapActionToAllocation(action: RecommendationAction): AllocationAction {
  switch (action) {
    case 'STRONG_BUY': return 'ENTER';
    case 'BUY': return 'INCREASE';
    case 'HOLD': return 'HOLD';
    case 'REDUCE': return 'DECREASE';
    case 'SELL': return 'EXIT';
    case 'STRONG_SELL': return 'EXIT';
    case 'AVOID': return 'MONITOR';
  }
}

function computeRawScore(rec: Recommendation): number {
  const { finalScore } = rec.scoreBreakdown;
  const confidenceBoost = rec.confidence * 0.15;
  const riskPenalty =
    rec.riskLevel === 'EXTREME' ? 0.35 :
    rec.riskLevel === 'HIGH' ? 0.2 :
    rec.riskLevel === 'MEDIUM' ? 0.08 : 0;
  return clamp(finalScore + confidenceBoost - riskPenalty, 0, 1);
}

function applyVolatilityPenalty(score: number, rec: Recommendation): number {
  if (rec.riskLevel === 'EXTREME') return score * 0.4;
  if (rec.riskLevel === 'HIGH') return score * 0.65;
  if (rec.riskLevel === 'MEDIUM') return score * 0.85;
  return score;
}

function applyNewsRiskPenalty(score: number, rec: Recommendation): number {
  const newsFlag = rec.reasoning.uncertaintyNotes.some((n) =>
    n.toLowerCase().includes('news risk') || n.toLowerCase().includes('high risk'),
  );
  return newsFlag ? score * 0.75 : score;
}

function applyProviderDegradationPenalty(score: number, rec: Recommendation): number {
  const degraded = rec.reasoning.uncertaintyNotes.some((n) =>
    n.toLowerCase().includes('degraded'),
  );
  return degraded ? score * 0.8 : score;
}

function normalizeWeights(scores: number[]): number[] {
  const total = scores.reduce((sum, s) => sum + s, 0);
  if (total === 0) return scores.map(() => 0);
  return scores.map((s) => s / total);
}

function computeCorrelationPenalty(
  symbol: string,
  assetClass: string,
  allocationsByClass: Map<string, number>,
): number {
  const classWeight = allocationsByClass.get(assetClass) ?? 0;
  if (classWeight > 0.5) return 0.15;
  if (classWeight > 0.35) return 0.08;
  return 0;
}

function buildAllocationReasoning(
  rec: Recommendation,
  currentWeight: number,
  targetWeight: number,
): string {
  const delta = ((targetWeight - currentWeight) * 100).toFixed(1);
  const direction = targetWeight > currentWeight ? 'increase' : targetWeight < currentWeight ? 'decrease' : 'maintain';
  const drivers = rec.reasoning.signalDrivers.slice(0, 2).join(', ');
  return `${direction.charAt(0).toUpperCase() + direction.slice(1)} position by ${Math.abs(parseFloat(delta))}% based on ${rec.action} recommendation (confidence ${(rec.confidence * 100).toFixed(0)}%). ${drivers}. Risk: ${rec.riskLevel}.`;
}

function computeDiversificationScore(allocations: PortfolioAllocation[]): number {
  if (allocations.length === 0) return 0;
  const weights = allocations.filter((a) => a.targetWeight > 0).map((a) => a.targetWeight);
  if (weights.length <= 1) return 0.1;
  const herfindahl = weights.reduce((sum, w) => sum + w * w, 0);
  const maxHerfindahl = 1;
  const minHerfindahl = 1 / weights.length;
  return clamp(1 - (herfindahl - minHerfindahl) / (maxHerfindahl - minHerfindahl), 0, 1);
}

export function computePortfolioIntelligence(
  input: PortfolioIntelligenceInput,
): PortfolioIntelligenceResult {
  const {
    recommendations,
    constraints = {},
    generatedAt = Date.now(),
  } = input;

  const maxPositionWeight = constraints.maxPositionWeight ?? 0.2;
  const minPositionWeight = constraints.minPositionWeight ?? 0.02;
  const maxCryptoWeight = constraints.maxCryptoWeight ?? 0.25;
  const rebalanceThreshold = constraints.rebalanceThreshold ?? 0.05;

  if (recommendations.length === 0) {
    return {
      allocations: [],
      portfolioSummary: {
        totalWeight: 0,
        diversificationScore: 0,
        concentrationRisk: 'UNKNOWN',
        dominantAssetClass: 'none',
        simulationOnlyNotice: 'Simulation only. No real capital deployed.',
        explanation: 'No recommendations available to compute allocations.',
      },
      rebalancePlan: [],
      riskAlerts: [],
      explanation: 'No recommendations provided. Portfolio intelligence requires at least one recommendation.',
      simulationOnly: true,
      liveAllowed: false,
      generatedAt,
    };
  }

  // Compute raw scores per asset
  const rawScores = recommendations.map(({ recommendation }) => {
    let score = computeRawScore(recommendation);
    score = applyVolatilityPenalty(score, recommendation);
    score = applyNewsRiskPenalty(score, recommendation);
    score = applyProviderDegradationPenalty(score, recommendation);
    return Math.max(score, 0);
  });

  // Zero out AVOIDed assets
  const adjustedScores = rawScores.map((score, i) =>
    recommendations[i]!.recommendation.action === 'AVOID' ? 0 : score,
  );

  // Normalize to weights
  let targetWeights = normalizeWeights(adjustedScores);

  // Apply max position cap
  let cappedAny = false;
  targetWeights = targetWeights.map((w) => {
    if (w > maxPositionWeight) { cappedAny = true; return maxPositionWeight; }
    return w;
  });

  // Re-normalize after capping
  if (cappedAny) {
    targetWeights = normalizeWeights(targetWeights);
  }

  // Apply min threshold — zero out below min (noise reduction)
  targetWeights = targetWeights.map((w) => (w < minPositionWeight ? 0 : w));
  targetWeights = normalizeWeights(targetWeights);

  // Track class distribution for correlation penalty
  const classTotals = new Map<string, number>();
  recommendations.forEach(({ assetClass = 'stock' }, i) => {
    classTotals.set(assetClass, (classTotals.get(assetClass) ?? 0) + (targetWeights[i] ?? 0));
  });

  // Apply crypto cap
  const cryptoTotal = classTotals.get('crypto') ?? 0;
  if (cryptoTotal > maxCryptoWeight) {
    const cryptoScale = maxCryptoWeight / cryptoTotal;
    targetWeights = targetWeights.map((w, i) =>
      (recommendations[i]!.assetClass ?? 'stock') === 'crypto' ? w * cryptoScale : w,
    );
    targetWeights = normalizeWeights(targetWeights);
  }

  // Apply correlation penalty and re-normalize
  const correlationAdjusted = targetWeights.map((w, i) => {
    const assetClass = recommendations[i]!.assetClass ?? 'stock';
    const penalty = computeCorrelationPenalty(
      recommendations[i]!.symbol,
      assetClass,
      classTotals,
    );
    return w * (1 - penalty);
  });
  targetWeights = normalizeWeights(correlationAdjusted);

  // Build allocations
  const riskAlerts: PortfolioRiskAlert[] = [];
  const allocations: PortfolioAllocation[] = recommendations.map(
    ({ symbol, assetClass = 'stock', recommendation, currentWeight = 0 }, i) => {
      const targetWeight = targetWeights[i] ?? 0;
      const deltaWeight = targetWeight - currentWeight;
      const suggestedAction = mapActionToAllocation(recommendation.action);
      const priorityScore = clamp(
        recommendation.confidence * 0.6 + recommendation.scoreBreakdown.finalScore * 0.4,
        0,
        1,
      );

      if (recommendation.riskLevel === 'EXTREME' || recommendation.riskLevel === 'HIGH') {
        riskAlerts.push({
          severity: recommendation.riskLevel === 'EXTREME' ? 'CRITICAL' : 'HIGH',
          symbol,
          message: `${symbol} has ${recommendation.riskLevel} risk`,
          detail: recommendation.reasoning.riskDrivers.slice(0, 2).join('; ') || 'High risk detected.',
        });
      }

      if (targetWeight > 0.15) {
        riskAlerts.push({
          severity: 'MEDIUM',
          symbol,
          message: `${symbol} concentration at ${(targetWeight * 100).toFixed(1)}%`,
          detail: 'Single-asset concentration above 15% increases portfolio risk.',
        });
      }

      return {
        symbol,
        assetClass,
        currentWeight,
        targetWeight,
        deltaWeight,
        suggestedAction,
        priorityScore,
        reasoning: buildAllocationReasoning(recommendation, currentWeight, targetWeight),
        recommendationAction: recommendation.action,
        confidence: recommendation.confidence,
        riskLevel: recommendation.riskLevel,
      };
    },
  );

  // Sort allocations by priority
  allocations.sort((a, b) => b.priorityScore - a.priorityScore);

  // Build rebalance plan — only trades above threshold
  const rebalancePlan: RebalanceTrade[] = allocations
    .filter((a) => Math.abs(a.deltaWeight) >= rebalanceThreshold)
    .map((a) => ({
      symbol: a.symbol,
      side: a.deltaWeight > 0 ? 'buy' : 'sell',
      targetWeightDelta: a.deltaWeight,
      estimatedNotionalPct: Math.abs(a.deltaWeight) * 100,
      reasoning: a.reasoning,
    }));

  const diversificationScore = computeDiversificationScore(allocations);
  const dominantClass = (() => {
    const classSums = new Map<string, number>();
    allocations.forEach((a) => {
      classSums.set(a.assetClass, (classSums.get(a.assetClass) ?? 0) + a.targetWeight);
    });
    let max = 0; let dominant = 'mixed';
    classSums.forEach((v, k) => { if (v > max) { max = v; dominant = k; } });
    return dominant;
  })();

  const concentrationRisk =
    diversificationScore < 0.3 ? 'HIGH' :
    diversificationScore < 0.6 ? 'MEDIUM' : 'LOW';

  if (input.degraded) {
    riskAlerts.push({
      severity: 'HIGH',
      message: 'Data quality degraded',
      detail: 'One or more providers are unavailable. Allocations are based on incomplete data.',
    });
  }

  const totalWeight = allocations.reduce((s, a) => s + a.targetWeight, 0);

  return {
    allocations,
    portfolioSummary: {
      totalWeight,
      diversificationScore,
      concentrationRisk,
      dominantAssetClass: dominantClass,
      simulationOnlyNotice: 'Simulation only — no real capital deployed.',
      explanation: `${allocations.length} assets analysed. Diversification score ${(diversificationScore * 100).toFixed(0)}%. Dominant class: ${dominantClass}. Concentration risk: ${concentrationRisk}.`,
    },
    rebalancePlan,
    riskAlerts,
    explanation: `Portfolio intelligence generated for ${allocations.length} assets. ${rebalancePlan.length} rebalance trades required (threshold ${(rebalanceThreshold * 100).toFixed(0)}%). Live execution is locked — simulation only.`,
    simulationOnly: true,
    liveAllowed: false,
    generatedAt,
  };
}
