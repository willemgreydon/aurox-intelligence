import type { MarketInsightSummary, SentimentState } from '@repo/api-contracts';
import type { IntelligenceMarketContext, SignalDirection, VolatilityState, RegimeState } from '../types/execution-types';

function classifyRegime(
  stance: SentimentState,
  direction: SignalDirection,
  volatilityState: VolatilityState,
): RegimeState {
  if (volatilityState === 'extreme') return 'volatile';
  if (stance === 'positive' && direction === 'long') return 'risk_on';
  if (stance === 'negative' && direction === 'short') return 'risk_off';
  return 'transitional';
}

export function synthesizeMarketContext(
  insight: MarketInsightSummary,
  direction: SignalDirection,
  volatilityState: VolatilityState,
): IntelligenceMarketContext {
  return {
    regime: classifyRegime(insight.stance, direction, volatilityState),
    volatilityState,
  };
}
