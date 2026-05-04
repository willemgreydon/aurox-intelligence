export type RecommendationAction =
  | 'STRONG_BUY'
  | 'BUY'
  | 'HOLD'
  | 'REDUCE'
  | 'SELL'
  | 'STRONG_SELL'
  | 'AVOID';

export type RecommendationHorizon = 'INTRADAY' | 'SWING' | 'POSITION' | 'LONG_TERM';
export type RecommendationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export type EngineRecommendationInput = {
  symbol: string;
  signalScore: number;
  newsImpactScore: number;
  riskPenalty: number;
  liquidityAdjustment: number;
  trend: number;
  momentum: number;
  volatility: number;
  riskFlags: string[];
  newsRiskFlag: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  providerDegraded: boolean;
  degraded: boolean;
  signalDrivers: string[];
  newsDrivers: string[];
  riskDrivers: string[];
};

export type Recommendation = {
  action: RecommendationAction;
  confidence: number;
  horizon: RecommendationHorizon;
  riskLevel: RecommendationRiskLevel;
  positionSizingSuggestion: number;
  simulationAllowed: boolean;
  liveAllowed: false;
  reasoning: {
    signalDrivers: string[];
    newsDrivers: string[];
    riskDrivers: string[];
    uncertaintyNotes: string[];
  };
  explanationText: string;
  scoreBreakdown: {
    signalScore: number;
    newsScore: number;
    riskPenalty: number;
    finalScore: number;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mapAction(score: number): RecommendationAction {
  if (score > 0.75) return 'STRONG_BUY';
  if (score > 0.55) return 'BUY';
  if (score > 0.45) return 'HOLD';
  if (score > 0.35) return 'REDUCE';
  if (score > 0.2) return 'SELL';
  return 'STRONG_SELL';
}

function downgradeAction(action: RecommendationAction): RecommendationAction {
  if (action === 'STRONG_BUY') return 'BUY';
  if (action === 'BUY') return 'HOLD';
  if (action === 'HOLD') return 'REDUCE';
  if (action === 'REDUCE') return 'SELL';
  if (action === 'SELL') return 'STRONG_SELL';
  return action;
}

function inferRiskLevel(input: EngineRecommendationInput): RecommendationRiskLevel {
  const riskComposite = clamp(input.riskPenalty * 0.55 + Math.abs(input.volatility) * 0.45, 0, 1);
  if (input.newsRiskFlag === 'CRITICAL' || riskComposite >= 0.8) return 'EXTREME';
  if (input.newsRiskFlag === 'HIGH' || riskComposite >= 0.6) return 'HIGH';
  if (input.newsRiskFlag === 'MEDIUM' || riskComposite >= 0.35) return 'MEDIUM';
  return 'LOW';
}

function inferHorizon(input: EngineRecommendationInput): RecommendationHorizon {
  if (Math.abs(input.momentum) > 0.65 && Math.abs(input.trend) > 0.55) return 'INTRADAY';
  if (Math.abs(input.momentum) > 0.45) return 'SWING';
  if (Math.abs(input.trend) > 0.35) return 'POSITION';
  return 'LONG_TERM';
}

export function computeRecommendation(input: EngineRecommendationInput): Recommendation {
  const signal = clamp((input.signalScore + 1) / 2, 0, 1);
  const news = clamp(input.newsImpactScore, 0, 1);
  const riskPenalty = clamp(input.riskPenalty, 0, 1);
  const liquidity = clamp(input.liquidityAdjustment, 0, 1);

  const rawFinal = signal * 0.5 + news * 0.2 - riskPenalty * 0.2 + liquidity * 0.1;
  const finalScore = clamp(rawFinal, 0, 1);

  let action = mapAction(finalScore);
  const riskLevel = inferRiskLevel(input);
  if (riskLevel === 'HIGH' || input.newsRiskFlag === 'HIGH') {
    action = downgradeAction(action);
  }
  if (riskLevel === 'EXTREME' || input.newsRiskFlag === 'CRITICAL') {
    action = 'AVOID';
  }

  let confidence = clamp(
    0.35 +
      Math.abs(input.trend) * 0.2 +
      Math.abs(input.momentum) * 0.2 +
      (1 - riskPenalty) * 0.2 +
      liquidity * 0.15,
    0,
    1,
  );

  const uncertaintyNotes: string[] = [];
  if (input.providerDegraded || input.degraded) {
    confidence = clamp(confidence - 0.18, 0, 1);
    uncertaintyNotes.push('Provider health is degraded, reducing confidence.');
  }

  const highRiskSimulationBlock = riskLevel === 'EXTREME' || input.newsRiskFlag === 'CRITICAL';
  if (riskLevel === 'HIGH' || input.newsRiskFlag === 'HIGH') {
    uncertaintyNotes.push('High risk detected; manual confirmation is required for simulation.');
  }

  const positionSizingSuggestion =
    action === 'AVOID'
      ? 0
      : clamp(finalScore * (1 - riskPenalty) * (riskLevel === 'HIGH' ? 0.45 : 0.8), 0, 1);

  return {
    action,
    confidence,
    horizon: inferHorizon(input),
    riskLevel,
    positionSizingSuggestion,
    simulationAllowed: !highRiskSimulationBlock,
    liveAllowed: false,
    reasoning: {
      signalDrivers: input.signalDrivers,
      newsDrivers: input.newsDrivers,
      riskDrivers: input.riskDrivers,
      uncertaintyNotes,
    },
    explanationText: '',
    scoreBreakdown: {
      signalScore: signal,
      newsScore: news,
      riskPenalty,
      finalScore,
    },
  };
}
