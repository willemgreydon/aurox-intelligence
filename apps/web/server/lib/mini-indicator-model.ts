import { movingAverage, volatility } from '@repo/signals';
import type { MiniIndicatorChartModel } from '../../lib/charts/mini-indicator-model';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function inferTrend(points: number[]): 'up' | 'down' | 'flat' {
  if (points.length < 2) {
    return 'flat';
  }

  const first = points[0] ?? 0;
  const last = points.at(-1) ?? first;
  const delta = last - first;
  if (Math.abs(delta) <= 1e-6) {
    return 'flat';
  }
  return delta > 0 ? 'up' : 'down';
}

export function deriveMiniIndicatorChartModel(
  pointsInput: number[] | null | undefined,
  signalScore?: number,
): MiniIndicatorChartModel {
  const points = (pointsInput ?? []).filter((value) => Number.isFinite(value)).slice(-24);

  if (points.length < 5) {
    return {
      points,
      movingAveragePoints: [],
      volatilityUpperBand: [],
      volatilityLowerBand: [],
      signalMarkerValue: null,
      signalScore: typeof signalScore === 'number' ? clamp(signalScore, -1, 1) : null,
      summary: 'Insufficient data for indicator overlays.',
      hasInsufficientData: true,
    };
  }

  const maWindow = Math.min(5, points.length);
  const movingAveragePoints = points.map((_, index) => {
    const segment = points.slice(Math.max(0, index - maWindow + 1), index + 1);
    const ma = movingAverage(segment, segment.length);
    return ma ?? segment.at(-1) ?? 0;
  });

  const volWindow = Math.min(8, points.length);
  const volatilitySeries = points.map((_, index) => {
    const segment = points.slice(Math.max(0, index - volWindow + 1), index + 1);
    return volatility(segment);
  });

  const volatilityUpperBand = points.map((value, index) => value + (volatilitySeries[index] ?? 0));
  const volatilityLowerBand = points.map((value, index) => Math.max(0, value - (volatilitySeries[index] ?? 0)));
  const trend = inferTrend(points);

  return {
    points,
    movingAveragePoints,
    volatilityUpperBand,
    volatilityLowerBand,
    signalMarkerValue: points.at(-1) ?? null,
    signalScore: typeof signalScore === 'number' ? clamp(signalScore, -1, 1) : null,
    summary: `Trend ${trend}. Last ${points.at(-1)?.toFixed(2) ?? 'n/a'}. MA(5) ${movingAveragePoints.at(-1)?.toFixed(2) ?? 'n/a'}.`,
    hasInsufficientData: false,
  };
}

