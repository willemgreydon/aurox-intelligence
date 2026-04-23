import type { AssetKind } from './broker-types';

export type SignalDirection = 'long' | 'short' | 'neutral';
export type RegimeState = 'risk_on' | 'risk_off' | 'transitional' | 'volatile';
export type VolatilityState = 'low' | 'moderate' | 'elevated' | 'extreme';
export type EntryStyle = 'market' | 'limit' | 'staged';

export interface IntelligenceSignal {
  readonly direction: SignalDirection;
  readonly score: number;
  readonly confidence: number;
}

export interface IntelligenceMarketContext {
  readonly regime: RegimeState;
  readonly volatilityState: VolatilityState;
  readonly breadthState?: string;
}

export interface IntelligenceFactors {
  readonly overall: number;
  readonly momentum?: number;
  readonly trend?: number;
}

export interface IntelligenceTradePlan {
  readonly entryStyle: EntryStyle;
  readonly thesis: string;
  readonly stopHint?: number;
  readonly targetHint?: number;
}

export interface IntelligenceDecisionBundle {
  readonly symbol: string;
  readonly assetKind: AssetKind;
  readonly marketContext: IntelligenceMarketContext;
  readonly signal: IntelligenceSignal;
  readonly factors?: IntelligenceFactors;
  readonly tradePlan?: IntelligenceTradePlan;
  readonly generatedAt: string;
}
