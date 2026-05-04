import type { NewsImpactExplanation, NewsProviderStatus, NewsRiskFlag } from '@repo/api-contracts';
import { buildRecommendationExplanation } from '../recommendation/recommendation-explainer';
import { computeRecommendation, type Recommendation } from '../recommendation/recommendation-engine';

export type SystemRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OrchestratorProviderHealthSummary = {
  total: number;
  healthy: number;
  degraded: number;
  unavailable: number;
  disabled: number;
  explanation: string;
};

export type OrchestratorNewsRiskSummary = {
  low: number;
  medium: number;
  high: number;
  critical: number;
  explanation: string;
};

export type AssetOrchestrationInput = {
  symbol: string;
  compositeScore: number;
  signalBreakdown: {
    trend: number;
    momentum: number;
    volatility: number;
  };
  recommendation: string;
  newsImpact: NewsImpactExplanation;
  volatility?: number;
  liquidity?: number;
  providerDegraded?: boolean;
  degraded?: boolean;
};

export type AssetState = {
  symbol: string;
  compositeScore: number;
  signalBreakdown: {
    trend: number;
    momentum: number;
    volatility: number;
  };
  newsImpact: NewsImpactExplanation;
  riskFlags: string[];
  recommendation: Recommendation;
  simulationAllowed: boolean;
  liveAllowed: false;
  explanation: string;
};

export type SystemState = {
  assetStates: AssetState[];
  recommendations: Array<{ symbol: string; recommendation: Recommendation }>;
  topOpportunities: Array<{ symbol: string; recommendation: Recommendation }>;
  highRiskAssets: Array<{ symbol: string; recommendation: Recommendation }>;
  avoidedAssets: Array<{ symbol: string; recommendation: Recommendation }>;
  systemRiskLevel: SystemRiskLevel;
  providerHealthSummary: OrchestratorProviderHealthSummary;
  newsRiskSummary: OrchestratorNewsRiskSummary;
  readinessState: {
    simulationReady: boolean;
    liveReady: false;
    reason: string;
  };
  degraded: boolean;
  explanation: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toSystemRiskLevel(score: number): SystemRiskLevel {
  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.55) return 'HIGH';
  if (score >= 0.3) return 'MEDIUM';
  return 'LOW';
}

function mapRiskFlagToScore(flag: NewsRiskFlag): number {
  if (flag === 'CRITICAL') return 1;
  if (flag === 'HIGH') return 0.7;
  if (flag === 'MEDIUM') return 0.4;
  return 0.1;
}

function summarizeProviderHealth(providerHealth: NewsProviderStatus[]): OrchestratorProviderHealthSummary {
  const summary = {
    total: providerHealth.length,
    healthy: providerHealth.filter((item) => item.health === 'healthy').length,
    degraded: providerHealth.filter((item) => item.health === 'degraded').length,
    unavailable: providerHealth.filter((item) => item.health === 'unavailable').length,
    disabled: providerHealth.filter((item) => item.health === 'disabled').length,
  };

  return {
    ...summary,
    explanation: `Provider health: ${summary.healthy}/${summary.total} healthy, ${summary.degraded} degraded, ${summary.unavailable} unavailable, ${summary.disabled} disabled.`,
  };
}

function summarizeNewsRisk(assetStates: AssetState[]): OrchestratorNewsRiskSummary {
  const summary = {
    low: assetStates.filter((item) => item.newsImpact.riskFlag === 'LOW').length,
    medium: assetStates.filter((item) => item.newsImpact.riskFlag === 'MEDIUM').length,
    high: assetStates.filter((item) => item.newsImpact.riskFlag === 'HIGH').length,
    critical: assetStates.filter((item) => item.newsImpact.riskFlag === 'CRITICAL').length,
  };

  return {
    ...summary,
    explanation: `News risk distribution: LOW ${summary.low}, MEDIUM ${summary.medium}, HIGH ${summary.high}, CRITICAL ${summary.critical}.`,
  };
}

export function orchestrateSystemState(input: {
  assets: AssetOrchestrationInput[];
  providerHealth: NewsProviderStatus[];
  degraded: boolean;
}): SystemState {
  const assetStates: AssetState[] = input.assets.map((asset) => {
    const isHighNewsRisk = asset.newsImpact.riskFlag === 'HIGH' || asset.newsImpact.riskFlag === 'CRITICAL';
    const negativeSignalCount = [asset.signalBreakdown.trend, asset.signalBreakdown.momentum, asset.signalBreakdown.volatility]
      .filter((value) => value < -0.15).length;
    const riskFlags: string[] = [];

    if (isHighNewsRisk) riskFlags.push('News risk requires manual simulation review.');
    if (negativeSignalCount >= 2) riskFlags.push('Multiple technical signals are negative.');

    const recommendation = computeRecommendation({
      symbol: asset.symbol,
      signalScore: clamp(asset.compositeScore, -1, 1),
      newsImpactScore: clamp(asset.newsImpact.score, 0, 1),
      riskPenalty: clamp(Math.abs(asset.signalBreakdown.volatility), 0, 1),
      liquidityAdjustment: clamp(asset.liquidity ?? 0.55, 0, 1),
      trend: clamp(asset.signalBreakdown.trend, -1, 1),
      momentum: clamp(asset.signalBreakdown.momentum, -1, 1),
      volatility: clamp(asset.volatility ?? Math.abs(asset.signalBreakdown.volatility), 0, 1),
      riskFlags,
      newsRiskFlag: asset.newsImpact.riskFlag,
      providerDegraded: asset.providerDegraded ?? false,
      degraded: asset.degraded ?? false,
      signalDrivers: [
        `Trend ${asset.signalBreakdown.trend.toFixed(3)}`,
        `Momentum ${asset.signalBreakdown.momentum.toFixed(3)}`,
      ],
      newsDrivers: [
        `News impact ${(asset.newsImpact.score * 100).toFixed(0)}%`,
        ...asset.newsImpact.keyDrivers.slice(0, 1),
      ],
      riskDrivers: [
        ...riskFlags,
        `Volatility ${(Math.abs(asset.signalBreakdown.volatility) * 100).toFixed(0)}%`,
      ],
    });
    recommendation.explanationText = buildRecommendationExplanation(recommendation);

    return {
      symbol: asset.symbol,
      compositeScore: clamp(asset.compositeScore, -1, 1),
      signalBreakdown: asset.signalBreakdown,
      newsImpact: asset.newsImpact,
      riskFlags,
      recommendation,
      simulationAllowed: !isHighNewsRisk && recommendation.simulationAllowed,
      liveAllowed: false,
      explanation: `Composite ${(asset.compositeScore * 100).toFixed(0)}%, news ${(asset.newsImpact.score * 100).toFixed(0)}% (${asset.newsImpact.riskFlag}), recommendation ${recommendation.action}. Live execution remains locked.`,
    };
  });

  const providerSummary = summarizeProviderHealth(input.providerHealth);
  const newsSummary = summarizeNewsRisk(assetStates);

  const avgNewsRisk = assetStates.length > 0
    ? assetStates.reduce((sum, asset) => sum + mapRiskFlagToScore(asset.newsImpact.riskFlag), 0) / assetStates.length
    : 0;
  const providerPenalty = providerSummary.total > 0
    ? (providerSummary.degraded + providerSummary.unavailable) / providerSummary.total
    : 0;
  const systemRiskLevel = toSystemRiskLevel(clamp(avgNewsRisk * 0.75 + providerPenalty * 0.6, 0, 1));

  const simulationReady = assetStates.some((asset) => asset.simulationAllowed);

  const recommendations = assetStates.map((asset) => ({
    symbol: asset.symbol,
    recommendation: asset.recommendation,
  }));
  const topOpportunities = [...recommendations]
    .filter((item) => item.recommendation.action === 'STRONG_BUY' || item.recommendation.action === 'BUY')
    .sort((a, b) => b.recommendation.scoreBreakdown.finalScore - a.recommendation.scoreBreakdown.finalScore)
    .slice(0, 10);
  const highRiskAssets = recommendations.filter((item) => item.recommendation.riskLevel === 'HIGH' || item.recommendation.riskLevel === 'EXTREME');
  const avoidedAssets = recommendations.filter((item) => item.recommendation.action === 'AVOID');

  return {
    assetStates,
    recommendations,
    topOpportunities,
    highRiskAssets,
    avoidedAssets,
    systemRiskLevel,
    providerHealthSummary: providerSummary,
    newsRiskSummary: newsSummary,
    readinessState: {
      simulationReady,
      liveReady: false,
      reason: 'Simulation mode active. No real orders are executed.',
    },
    degraded: input.degraded || providerSummary.degraded > 0 || providerSummary.unavailable > 0,
    explanation: `System risk ${systemRiskLevel}. ${providerSummary.explanation} ${newsSummary.explanation} Simulation-only execution is enforced.`,
  };
}
