export type SignalScoreLabel = 'strong_bearish' | 'bearish' | 'neutral' | 'bullish' | 'strong_bullish';

export type RecommendationHorizon = 'intraday' | 'swing' | 'long-term';
export type RecommendationMode = 'deterministic' | 'ai-assisted';
export type RecommendationAction = 'buy' | 'watch' | 'hold' | 'avoid' | 'reduce';
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export type MarketRegime = 'risk_on' | 'risk_off' | 'transitional' | 'volatile';

export interface DeterministicSignalSnapshot {
  readonly score: number;
  readonly label: SignalScoreLabel;
  readonly confidence: number;
  readonly explanation: string;
  readonly contributingIndicators: readonly string[];
}

export interface RecommendationInput {
  readonly symbol: string;
  readonly assetClass: 'stock' | 'etf' | 'crypto';
  readonly signalScore: number;
  readonly signalConfidence: number;
  readonly factorScore: number;
  readonly riskScore: number;
  readonly volatility: number;
  readonly liquidity: number;
  readonly marketRegime?: MarketRegime;
}

export interface RecommendationResult {
  readonly recommendation: RecommendationAction;
  readonly confidence: number;
  readonly rationale: readonly string[];
  readonly riskWarnings: readonly string[];
  readonly horizon: RecommendationHorizon;
  readonly mode: RecommendationMode;
}
