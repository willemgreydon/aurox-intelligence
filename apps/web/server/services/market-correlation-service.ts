import { getInvestmentUniverse, getMarketHistoryBarsBySymbols } from '@repo/db';
import { computeCorrelationMatrix, type CorrelationAssetSeries } from '@repo/signals';
import type { CorrelationMatrix } from '@repo/api-contracts';

/**
 * Market Correlation service. Builds a synchronized-returns correlation matrix
 * across a bounded set of tradable assets, using the pure @repo/signals engine
 * (Pearson on aligned daily log-returns; pairs with insufficient overlap are
 * reported unavailable, never fabricated). One batched DB query + pure compute.
 *
 * Bounded to a small set so the heatmap stays readable (an N×N grid is only
 * legible for small N) and the correlation math stays cheap.
 */

const MAX_ASSETS = 14;
const HISTORY_BARS = 90;
const WINDOW = 60;
const MIN_OBSERVATIONS = 30;

export type MarketCorrelationResult = {
  matrix: CorrelationMatrix | null;
  /** symbol → display name. */
  labels: Record<string, string>;
};

export async function getMarketCorrelationData(
  nowIso: string = new Date().toISOString(),
): Promise<MarketCorrelationResult> {
  const universe = await getInvestmentUniverse().catch(() => []);
  const selected = universe.filter((asset) => asset.isSimulated).slice(0, MAX_ASSETS);
  if (selected.length < 2) {
    return { matrix: null, labels: {} };
  }

  const symbols = selected.map((asset) => asset.symbol);
  const barsBySymbol = await getMarketHistoryBarsBySymbols(symbols, HISTORY_BARS).catch(
    () => ({}) as Record<string, never[]>,
  );

  const series: CorrelationAssetSeries[] = selected
    .map((asset) => ({
      assetId: asset.symbol,
      bars: (barsBySymbol[asset.symbol] ?? []).map((bar) => ({ timestamp: bar.timestamp, close: bar.close })),
    }))
    .filter((entry) => entry.bars.length >= 2);

  if (series.length < 2) {
    return { matrix: null, labels: {} };
  }

  const matrix = computeCorrelationMatrix(series, {
    window: WINDOW,
    minObservations: MIN_OBSERVATIONS,
    generatedAt: nowIso,
  });
  const labels = Object.fromEntries(selected.map((asset) => [asset.symbol, asset.name]));

  return { matrix, labels };
}
