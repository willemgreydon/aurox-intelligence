import { momentum } from '../indicators/momentum';
import { movingAverage } from '../indicators/moving-average';
import { trendStrength } from '../indicators/trend-strength';
import { volatility } from '../indicators/volatility';
import { compositeScore } from '../scoring/composite-score';
import type { DerivedSignal } from '../models/derived-signal';

export interface SignalSnapshot extends DerivedSignal {
  assetId: string;
  latestPrice: number | null;
  shortMovingAverage: number | null;
  longMovingAverage: number | null;
  momentumValue: number | null;
  volatilityValue: number;
  trendStrengthValue: number;
  compositeScoreValue: number;
  confidenceScore: number;
  scoreBreakdown: {
    movingAverageContrib: number;
    momentumContrib: number;
    trendContrib: number;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function deriveSignalSnapshot(assetId: string, values: number[]): SignalSnapshot {
  const lastValue = values.at(-1);
  const latestPrice = lastValue !== undefined && Number.isFinite(lastValue) ? lastValue : null;
  const shortMovingAverage = movingAverage(values, Math.min(5, values.length));
  const longMovingAverage = movingAverage(values, Math.min(20, values.length));
  const momentumValue = momentum(values);
  const volatilityValue = volatility(values);
  const trendStrengthValue = momentumValue === null ? 0 : trendStrength(momentumValue, volatilityValue);
  const movingAverageSpread =
    shortMovingAverage !== null && longMovingAverage !== null && longMovingAverage !== 0
      ? (shortMovingAverage - longMovingAverage) / longMovingAverage
      : 0;
  const normalizedMomentum = latestPrice && momentumValue !== null ? momentumValue / latestPrice : 0;
  const normalizedTrend = trendStrengthValue / 10;
  const compositeScoreValue = clamp(compositeScore([movingAverageSpread, normalizedMomentum, normalizedTrend]), -1, 1);
  const interpretation =
    compositeScoreValue > 0.05 ? 'bullish' : compositeScoreValue < -0.05 ? 'bearish' : 'neutral';

  const confidenceScore = clamp((Math.abs(compositeScoreValue) + trendStrengthValue / 10) / 2, 0.2, 0.95);

  return {
    assetId,
    name: `${assetId} composite signal`,
    value: compositeScoreValue,
    interpretation,
    latestPrice,
    shortMovingAverage,
    longMovingAverage,
    momentumValue,
    volatilityValue,
    trendStrengthValue,
    compositeScoreValue,
    confidenceScore,
    scoreBreakdown: {
      movingAverageContrib: movingAverageSpread,
      momentumContrib: normalizedMomentum,
      trendContrib: normalizedTrend,
    },
  };
}
