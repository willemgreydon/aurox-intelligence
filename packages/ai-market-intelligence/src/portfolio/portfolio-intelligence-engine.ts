import type { Recommendation, RecommendationAction } from '../recommendation/recommendation-engine';

export type AllocationAction = 'INCREASE' | 'DECREASE' | 'HOLD' | 'ENTER' | 'EXIT' | 'MONITOR';

// ─── Factor Decomposition ─────────────────────────────────────────────────────

export type FactorDecomposition = {
  momentumContribution: number;
  confidenceContribution: number;
  volatilityPenalty: number;
  liquidityPenalty: number;
  newsRiskPenalty: number;
  providerReliabilityPenalty: number;
  correlationPenalty: number;
  finalRawScore: number;
  normalizedScore: number;
  explanation: string[];
};

// ─── Risk Overlay ─────────────────────────────────────────────────────────────

export type RiskOverlayLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskOverlay = {
  riskScore: number; // 0–100
  riskLevel: RiskOverlayLevel;
  volatilityRisk: number; // 0–1
  liquidityRisk: number;  // 0–1
  newsRisk: number;       // 0–1
  correlationRisk: number; // 0–1
  providerRisk: number;    // 0–1
  anomalyRisk?: number;    // 0–1, optional
  explanation: string[];
};

// ─── Portfolio-Level Diagnostics ──────────────────────────────────────────────

export type AllocationHealth = 'healthy' | 'concentrated' | 'high-risk' | 'insufficient-data';

export type PortfolioDiagnostics = {
  diversificationScore: number;
  concentrationScore: number;
  cryptoExposure: number;
  equityExposure: number;
  etfExposure: number;
  cashTargetWeight: number;
  averageConfidence: number;
  averageRiskScore: number;
  dominantRiskFactors: string[];
  allocationHealth: AllocationHealth;
};

// ─── Cross-Asset Ranking ──────────────────────────────────────────────────────

export type AssetRanking = {
  rank: number;
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'other';
  recommendation: RecommendationAction;
  finalScore: number;
  confidence: number;
  targetWeight: number;
  riskScore: number;
  reasonShort: string;
  reasonDetailed: string[];
};

// ─── Regime Awareness ────────────────────────────────────────────────────────

export type MarketRegime = 'bull' | 'bear' | 'sideways' | 'volatile' | 'unknown';

export type RegimeAwareness = {
  regime: MarketRegime;
  confidence: number; // 0–1
  evidence: string[];
  allocationBias: {
    riskOn: number;    // 0–1 preference
    riskOff: number;   // 0–1 preference
    cashPreference: number;
    cryptoPreference: number;
    equityPreference: number;
  };
};

// ─── Existing types (preserved, extended) ─────────────────────────────────────

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
  // v2 additions
  factorDecomposition: FactorDecomposition;
  riskOverlay: RiskOverlay;
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
  // v2 additions
  diagnostics: PortfolioDiagnostics;
  ranking: AssetRanking[];
  regime: RegimeAwareness;
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

// ─── Utilities ────────────────────────────────────────────────────────────────

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

// ─── Factor Decomposition Logic ───────────────────────────────────────────────

function computeFactorDecomposition(
  rec: Recommendation,
  correlationPenaltyApplied: number,
  normalizedScore: number,
): FactorDecomposition {
  const { finalScore, signalScore, riskPenalty } = rec.scoreBreakdown;
  const momentumContribution = clamp(signalScore * 0.5, 0, 1);
  const confidenceContribution = rec.confidence * 0.15;

  const volatilityPenalty =
    rec.riskLevel === 'EXTREME' ? 0.35 :
    rec.riskLevel === 'HIGH' ? 0.20 :
    rec.riskLevel === 'MEDIUM' ? 0.08 : 0;

  const liquidityPenalty = 0; // placeholder — extend if liquidity score available

  const newsRiskFlag = rec.reasoning.uncertaintyNotes.some((n) =>
    n.toLowerCase().includes('news risk') || n.toLowerCase().includes('high risk'),
  );
  const newsRiskPenalty = newsRiskFlag ? 0.25 : 0;

  const degradedFlag = rec.reasoning.uncertaintyNotes.some((n) =>
    n.toLowerCase().includes('degraded'),
  );
  const providerReliabilityPenalty = degradedFlag ? 0.20 : 0;

  const finalRawScore = clamp(
    finalScore + confidenceContribution - volatilityPenalty - newsRiskPenalty - providerReliabilityPenalty,
    0,
    1,
  );

  const explanation: string[] = [
    `Momentum/signal: ${(momentumContribution * 100).toFixed(0)}% (signal score ${(signalScore * 100).toFixed(0)}%)`,
    `Confidence boost: +${(confidenceContribution * 100).toFixed(0)}%`,
  ];
  if (volatilityPenalty > 0) explanation.push(`Volatility penalty: -${(volatilityPenalty * 100).toFixed(0)}% (${rec.riskLevel} risk)`);
  if (newsRiskPenalty > 0) explanation.push(`News risk penalty: -${(newsRiskPenalty * 100).toFixed(0)}%`);
  if (providerReliabilityPenalty > 0) explanation.push(`Provider degradation penalty: -${(providerReliabilityPenalty * 100).toFixed(0)}%`);
  if (correlationPenaltyApplied > 0) explanation.push(`Correlation penalty: -${(correlationPenaltyApplied * 100).toFixed(0)}%`);
  if (riskPenalty > 0) explanation.push(`Risk penalty from recommendation: -${(riskPenalty * 100).toFixed(0)}%`);
  explanation.push(`Final normalized score: ${(normalizedScore * 100).toFixed(1)}%`);

  return {
    momentumContribution,
    confidenceContribution,
    volatilityPenalty,
    liquidityPenalty,
    newsRiskPenalty,
    providerReliabilityPenalty,
    correlationPenalty: correlationPenaltyApplied,
    finalRawScore,
    normalizedScore,
    explanation,
  };
}

// ─── Risk Overlay Logic ───────────────────────────────────────────────────────

function computeRiskOverlay(rec: Recommendation, classConcentration: number): RiskOverlay {
  const volatilityRisk =
    rec.riskLevel === 'EXTREME' ? 0.95 :
    rec.riskLevel === 'HIGH' ? 0.75 :
    rec.riskLevel === 'MEDIUM' ? 0.45 : 0.15;

  const newsFlag = rec.reasoning.uncertaintyNotes.some((n) =>
    n.toLowerCase().includes('news risk') || n.toLowerCase().includes('high risk'),
  );
  const newsRisk = newsFlag ? 0.7 : rec.reasoning.newsDrivers.length > 0 ? 0.3 : 0.1;

  const providerFlag = rec.reasoning.uncertaintyNotes.some((n) =>
    n.toLowerCase().includes('degraded'),
  );
  const providerRisk = providerFlag ? 0.6 : 0.1;

  const correlationRisk = classConcentration > 0.5 ? 0.7 : classConcentration > 0.35 ? 0.4 : 0.1;

  const liquidityRisk = 0.1; // placeholder

  // Weighted composite risk score 0–100
  const riskScore = clamp(
    (volatilityRisk * 40 + newsRisk * 25 + correlationRisk * 20 + providerRisk * 10 + liquidityRisk * 5),
    0,
    100,
  );

  const riskLevel: RiskOverlayLevel =
    riskScore >= 70 ? 'critical' :
    riskScore >= 45 ? 'high' :
    riskScore >= 25 ? 'medium' : 'low';

  const explanation: string[] = [
    `Volatility risk: ${(volatilityRisk * 100).toFixed(0)}% (${rec.riskLevel} recommendation risk level)`,
    `News risk: ${(newsRisk * 100).toFixed(0)}%`,
    `Correlation/concentration risk: ${(correlationRisk * 100).toFixed(0)}%`,
    `Provider reliability risk: ${(providerRisk * 100).toFixed(0)}%`,
    `Composite risk score: ${riskScore.toFixed(0)}/100`,
  ];

  return {
    riskScore,
    riskLevel,
    volatilityRisk,
    liquidityRisk,
    newsRisk,
    correlationRisk,
    providerRisk,
    explanation,
  };
}

// ─── Portfolio Diagnostics ────────────────────────────────────────────────────

function computePortfolioDiagnostics(
  allocations: PortfolioAllocation[],
): PortfolioDiagnostics {
  const active = allocations.filter((a) => a.targetWeight > 0);
  if (active.length === 0) {
    return {
      diversificationScore: 0,
      concentrationScore: 1,
      cryptoExposure: 0,
      equityExposure: 0,
      etfExposure: 0,
      cashTargetWeight: 1,
      averageConfidence: 0,
      averageRiskScore: 0,
      dominantRiskFactors: ['insufficient-data'],
      allocationHealth: 'insufficient-data',
    };
  }

  const weights = active.map((a) => a.targetWeight);
  const herfindahl = weights.reduce((sum, w) => sum + w * w, 0);
  const minH = 1 / weights.length;
  const diversificationScore = clamp(1 - (herfindahl - minH) / (1 - minH), 0, 1);
  const concentrationScore = herfindahl; // higher = more concentrated

  const classSum = (cls: string) =>
    allocations.filter((a) => a.assetClass === cls).reduce((s, a) => s + a.targetWeight, 0);

  const cryptoExposure = classSum('crypto');
  const equityExposure = classSum('stock');
  const etfExposure = classSum('etf');
  const cashTargetWeight = clamp(1 - allocations.reduce((s, a) => s + a.targetWeight, 0), 0, 1);

  const averageConfidence = active.reduce((s, a) => s + a.confidence, 0) / active.length;
  const averageRiskScore = active.reduce((s, a) => s + a.riskOverlay.riskScore, 0) / active.length;

  const dominantRiskFactors: string[] = [];
  if (averageRiskScore > 60) dominantRiskFactors.push('high-volatility');
  if (cryptoExposure > 0.3) dominantRiskFactors.push('crypto-concentration');
  if (concentrationScore > 0.3) dominantRiskFactors.push('asset-concentration');
  if (averageConfidence < 0.4) dominantRiskFactors.push('low-signal-confidence');
  if (dominantRiskFactors.length === 0) dominantRiskFactors.push('none');

  const allocationHealth: AllocationHealth =
    active.length === 0 ? 'insufficient-data' :
    averageRiskScore > 60 || concentrationScore > 0.5 ? 'high-risk' :
    concentrationScore > 0.3 ? 'concentrated' : 'healthy';

  return {
    diversificationScore,
    concentrationScore,
    cryptoExposure,
    equityExposure,
    etfExposure,
    cashTargetWeight,
    averageConfidence,
    averageRiskScore,
    dominantRiskFactors,
    allocationHealth,
  };
}

// ─── Cross-Asset Ranking ──────────────────────────────────────────────────────

function buildRanking(allocations: PortfolioAllocation[]): AssetRanking[] {
  return allocations
    .map((a) => ({
      rank: 0, // assigned after sort
      symbol: a.symbol,
      assetClass: a.assetClass,
      recommendation: a.recommendationAction,
      finalScore: a.factorDecomposition.normalizedScore,
      confidence: a.confidence,
      targetWeight: a.targetWeight,
      riskScore: a.riskOverlay.riskScore,
      reasonShort: buildShortReason(a),
      reasonDetailed: buildDetailedReason(a),
    }))
    .sort((x, y) => {
      // Sort by finalScore descending; break ties by lower riskScore
      if (y.finalScore !== x.finalScore) return y.finalScore - x.finalScore;
      return x.riskScore - y.riskScore;
    })
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}

function buildShortReason(a: PortfolioAllocation): string {
  const action = a.recommendationAction;
  const conf = (a.confidence * 100).toFixed(0);
  return `${action} at ${conf}% confidence — ${a.riskLevel} risk`;
}

function buildDetailedReason(a: PortfolioAllocation): string[] {
  return [
    ...a.factorDecomposition.explanation,
    ...a.riskOverlay.explanation,
    `Target weight: ${(a.targetWeight * 100).toFixed(1)}%`,
    `Current weight: ${(a.currentWeight * 100).toFixed(1)}%`,
    `Weight delta: ${a.deltaWeight >= 0 ? '+' : ''}${(a.deltaWeight * 100).toFixed(1)}%`,
  ];
}

// ─── Regime Detection ─────────────────────────────────────────────────────────

function detectRegime(
  allocations: PortfolioAllocation[],
  degraded: boolean,
): RegimeAwareness {
  if (degraded || allocations.length === 0) {
    return {
      regime: 'unknown',
      confidence: 0,
      evidence: ['Insufficient or degraded data — regime cannot be determined.'],
      allocationBias: {
        riskOn: 0.5, riskOff: 0.5,
        cashPreference: 0.5,
        cryptoPreference: 0.5,
        equityPreference: 0.5,
      },
    };
  }

  const active = allocations.filter((a) => a.targetWeight > 0);
  const avgScore = active.reduce((s, a) => s + a.factorDecomposition.finalRawScore, 0) / (active.length || 1);
  const avgRisk = active.reduce((s, a) => s + a.riskOverlay.riskScore, 0) / (active.length || 1);
  const avgConf = active.reduce((s, a) => s + a.confidence, 0) / (active.length || 1);
  const bullishCount = active.filter((a) => a.recommendationAction === 'STRONG_BUY' || a.recommendationAction === 'BUY').length;
  const bearishCount = active.filter((a) => a.recommendationAction === 'SELL' || a.recommendationAction === 'STRONG_SELL' || a.recommendationAction === 'AVOID').length;

  const bullishRatio = bullishCount / (active.length || 1);
  const bearishRatio = bearishCount / (active.length || 1);

  let regime: MarketRegime;
  const evidence: string[] = [];
  let regimeConfidence: number;

  if (avgConf < 0.35) {
    regime = 'unknown';
    regimeConfidence = 0.2;
    evidence.push(`Average signal confidence ${(avgConf * 100).toFixed(0)}% too low for regime classification.`);
  } else if (avgRisk > 65) {
    regime = 'volatile';
    regimeConfidence = clamp(avgRisk / 100, 0.3, 0.8);
    evidence.push(`Average risk score ${avgRisk.toFixed(0)}/100 indicates high volatility regime.`);
  } else if (bullishRatio > 0.6 && avgScore > 0.55) {
    regime = 'bull';
    regimeConfidence = clamp(bullishRatio * avgConf, 0.3, 0.85);
    evidence.push(`${bullishCount}/${active.length} assets with bullish signals.`);
    evidence.push(`Average score ${(avgScore * 100).toFixed(0)}% above neutral.`);
  } else if (bearishRatio > 0.5 || avgScore < 0.35) {
    regime = 'bear';
    regimeConfidence = clamp(bearishRatio * avgConf, 0.3, 0.8);
    evidence.push(`${bearishCount}/${active.length} assets with bearish/avoid signals.`);
    evidence.push(`Average score ${(avgScore * 100).toFixed(0)}% below neutral.`);
  } else {
    regime = 'sideways';
    regimeConfidence = clamp(avgConf * 0.7, 0.2, 0.6);
    evidence.push(`Mixed signals — ${bullishCount} bullish, ${bearishCount} bearish out of ${active.length}.`);
    evidence.push(`Average score ${(avgScore * 100).toFixed(0)}% near neutral.`);
  }

  if (avgConf >= 0.35) {
    evidence.push(`Average confidence: ${(avgConf * 100).toFixed(0)}%.`);
  }

  const riskOn = regime === 'bull' ? 0.7 : regime === 'bear' ? 0.2 : regime === 'volatile' ? 0.3 : 0.5;
  const riskOff = 1 - riskOn;
  const cashPreference = regime === 'bear' ? 0.7 : regime === 'volatile' ? 0.5 : 0.2;
  const cryptoPreference = regime === 'bull' ? 0.6 : regime === 'bear' ? 0.2 : 0.4;
  const equityPreference = regime === 'bull' ? 0.7 : regime === 'bear' ? 0.3 : 0.5;

  return {
    regime,
    confidence: regimeConfidence,
    evidence,
    allocationBias: { riskOn, riskOff, cashPreference, cryptoPreference, equityPreference },
  };
}

// ─── Scoring helpers (preserved) ─────────────────────────────────────────────

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
  _symbol: string,
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

// ─── Main Export ──────────────────────────────────────────────────────────────

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
    const emptyDiagnostics: PortfolioDiagnostics = {
      diversificationScore: 0,
      concentrationScore: 1,
      cryptoExposure: 0,
      equityExposure: 0,
      etfExposure: 0,
      cashTargetWeight: 1,
      averageConfidence: 0,
      averageRiskScore: 0,
      dominantRiskFactors: ['insufficient-data'],
      allocationHealth: 'insufficient-data',
    };
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
      diagnostics: emptyDiagnostics,
      ranking: [],
      regime: {
        regime: 'unknown',
        confidence: 0,
        evidence: ['No recommendations available.'],
        allocationBias: { riskOn: 0.5, riskOff: 0.5, cashPreference: 0.5, cryptoPreference: 0.5, equityPreference: 0.5 },
      },
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

  if (cappedAny) {
    targetWeights = normalizeWeights(targetWeights);
  }

  // Apply min threshold
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

  // Track correlation penalties per asset (needed for factor decomposition)
  const correlationPenalties: number[] = recommendations.map((_, i) => {
    const assetClass = recommendations[i]!.assetClass ?? 'stock';
    return computeCorrelationPenalty(recommendations[i]!.symbol, assetClass, classTotals);
  });

  // Apply correlation penalty and re-normalize
  const correlationAdjusted = targetWeights.map((w, i) => w * (1 - (correlationPenalties[i] ?? 0)));
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

      const corrPenalty = correlationPenalties[i] ?? 0;
      const normalizedScore = targetWeight;
      const factorDecomposition = computeFactorDecomposition(recommendation, corrPenalty, normalizedScore);
      const classConcentration = classTotals.get(assetClass) ?? 0;
      const riskOverlay = computeRiskOverlay(recommendation, classConcentration);

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
        factorDecomposition,
        riskOverlay,
      };
    },
  );

  // Sort allocations by priority
  allocations.sort((a, b) => b.priorityScore - a.priorityScore);

  // Build rebalance plan
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
  const diagnostics = computePortfolioDiagnostics(allocations);
  const ranking = buildRanking(allocations);
  const regime = detectRegime(allocations, input.degraded ?? false);

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
    diagnostics,
    ranking,
    regime,
  };
}
