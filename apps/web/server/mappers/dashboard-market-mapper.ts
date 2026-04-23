import type { ComparisonBar, HeatmapRow, SeriesPoint } from '../../lib/dashboard/analytics-fixtures';
import { formatShortDateLabel } from '../../lib/formatters';
import type { AnalysisReadModel } from '../queries/analysis-query';

export type DashboardMarketAnalyticsViewModel = {
  trendSeries: SeriesPoint[];
  relativePerformance: ComparisonBar[];
  correlationHeatmap: HeatmapRow[];
  notes: string[];
};

function toLabel(timestamp: string) {
  return formatShortDateLabel(timestamp);
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeSeries(values: number[]) {
  if (values.length === 0) {
    return [];
  }

  const base = values[0] || 1;
  return values.map((value) => round((value / base) * 100, 2));
}

function latestReturn(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const first = values[0] || 1;
  const last = values.at(-1) || first;
  return round(((last - first) / first) * 100, 2);
}

function dailyReturns(values: number[]) {
  return values.slice(1).map((value, index) => {
    const prior = values[index] || 1;
    return prior === 0 ? 0 : (value - prior) / prior;
  });
}

function correlation(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);

  if (length < 2) {
    return 0;
  }

  const x = left.slice(-length);
  const y = right.slice(-length);
  const xMean = x.reduce((sum, value) => sum + value, 0) / length;
  const yMean = y.reduce((sum, value) => sum + value, 0) / length;
  let numerator = 0;
  let xVariance = 0;
  let yVariance = 0;

  for (let index = 0; index < length; index += 1) {
    const xDelta = x[index]! - xMean;
    const yDelta = y[index]! - yMean;
    numerator += xDelta * yDelta;
    xVariance += xDelta * xDelta;
    yVariance += yDelta * yDelta;
  }

  const denominator = Math.sqrt(xVariance * yVariance);
  return denominator === 0 ? 0 : round(numerator / denominator, 2);
}

function mapTone(value: number): ComparisonBar['tone'] {
  if (value > 0.5) {
    return 'positive';
  }

  if (value < -0.5) {
    return 'negative';
  }

  return 'neutral';
}

export function mapDashboardMarketAnalytics(readModel: AnalysisReadModel): DashboardMarketAnalyticsViewModel {
  const liveAssets = readModel.assets.filter((asset) => asset.history.length >= 6);
  const primaryAsset = liveAssets[0] ?? null;
  const benchmarkAsset = liveAssets.find((asset) => asset.symbol === 'SPY') ?? liveAssets[1] ?? primaryAsset;

  const trendSeries =
    primaryAsset && benchmarkAsset
      ? (() => {
          const primaryHistory = primaryAsset.history.slice(-6);
          const benchmarkHistory = benchmarkAsset.history.slice(-6);
          const primaryValues = normalizeSeries(primaryHistory.map((point) => point.close));
          const benchmarkValues = normalizeSeries(benchmarkHistory.map((point) => point.close));

          return primaryHistory.map((point, index) => {
            const primary = primaryValues[index] ?? 100;
            const benchmark = benchmarkValues[index] ?? 100;
            return {
              label: toLabel(point.timestamp),
              primary,
              benchmark,
              lower: round(primary - 2.5, 2),
              upper: round(primary + 2.5, 2),
            };
          });
        })()
      : [];

  const relativePerformance = liveAssets.slice(0, 5).map((asset) => {
    const value = latestReturn(asset.history.slice(-5).map((point) => point.close));
    return {
      label: asset.symbol,
      value,
      tone: mapTone(value),
    };
  });

  const heatmapAssets = liveAssets.slice(0, 4);
  const correlationHeatmap = heatmapAssets.map((asset) => ({
    label: asset.symbol,
    cells: heatmapAssets.map((comparison) => ({
      label: comparison.symbol,
      value: correlation(
        dailyReturns(asset.history.slice(-10).map((point) => point.close)),
        dailyReturns(comparison.history.slice(-10).map((point) => point.close)),
      ),
    })),
  }));

  return {
    trendSeries,
    relativePerformance,
    correlationHeatmap,
    notes: [
      readModel.providerError
        ? `Live analytics are partial because the provider returned an error: ${readModel.providerError}`
        : `Live trend analytics are being derived from ${liveAssets.length} provider-backed asset histories.`,
      primaryAsset ? `${primaryAsset.symbol} is being used as the primary live dashboard trend series.` : 'No primary live trend series is currently available.',
      benchmarkAsset ? `${benchmarkAsset.symbol} is being used as the dashboard benchmark reference.` : 'No live benchmark reference is currently available.',
    ],
  };
}
