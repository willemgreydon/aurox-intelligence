export type TradeRiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface TradeRiskInput {
  readonly symbol: string;
  readonly assetClass: 'stock' | 'etf' | 'crypto';
  readonly price: number;
  readonly quantity: number;
  readonly portfolioValue: number;
  readonly existingExposure: number;
  readonly volatility: number;
  readonly liquidity: number;
  readonly maxPositionPercent?: number;
}

export interface TradeRiskAssessment {
  readonly maxPositionSizeSuggestion: number;
  readonly estimatedVolatility: number;
  readonly drawdownWarning: string | null;
  readonly liquiditySpreadWarning: string | null;
  readonly stopLossSuggestion: number;
  readonly exposureImpactPercent: number;
  readonly concentrationWarning: string | null;
  readonly riskLevel: TradeRiskLevel;
}
