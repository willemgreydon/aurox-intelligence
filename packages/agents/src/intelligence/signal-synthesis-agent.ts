import type { SignalSnapshot } from '@repo/signals';
import type { IntelligenceSignal, IntelligenceFactors, VolatilityState } from '../types/execution-types';

export function classifyVolatility(volatilityValue: number): VolatilityState {
  if (volatilityValue < 1.5) return 'low';
  if (volatilityValue < 3.0) return 'moderate';
  if (volatilityValue < 5.0) return 'elevated';
  return 'extreme';
}

export function synthesizeSignal(snapshot: SignalSnapshot): IntelligenceSignal {
  return {
    direction:
      snapshot.interpretation === 'bullish' ? 'long'
      : snapshot.interpretation === 'bearish' ? 'short'
      : 'neutral',
    score: snapshot.compositeScoreValue,
    confidence: snapshot.confidenceScore,
  };
}

export function synthesizeFactors(snapshot: SignalSnapshot): IntelligenceFactors {
  return {
    overall: snapshot.compositeScoreValue,
    momentum: snapshot.scoreBreakdown.momentumContrib,
    trend: snapshot.scoreBreakdown.trendContrib,
  };
}
