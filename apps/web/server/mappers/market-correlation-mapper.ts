import type { MarketCorrelationResult } from '../services/market-correlation-service';

/**
 * PURE mapper: turns the correlation service result into a display-ready heatmap
 * view model. Unavailable pairs (insufficient overlapping history) are surfaced
 * honestly as `available: false` cells — never a fabricated 0. No I/O.
 */

export type CorrelationCellVM = {
  a: string;
  b: string;
  value: number | null;
  display: string;
  available: boolean;
  isDiagonal: boolean;
  ariaLabel: string;
};

export type CorrelationHeatmapViewModel = {
  available: boolean;
  emptyReason: string | null;
  symbols: string[];
  names: Record<string, string>;
  rows: CorrelationCellVM[][];
  coverageLabel: string;
  windowLabel: string;
  asOfLabel: string;
};

function formatAsOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.toUTCString().slice(5, 17)} UTC`;
}

export function mapMarketCorrelation(result: MarketCorrelationResult): CorrelationHeatmapViewModel {
  const matrix = result.matrix;
  if (!matrix || matrix.assetIds.length < 2) {
    return {
      available: false,
      emptyReason: 'Not enough overlapping price history to compute correlations yet.',
      symbols: [],
      names: {},
      rows: [],
      coverageLabel: '',
      windowLabel: '',
      asOfLabel: matrix ? formatAsOf(matrix.generatedAt) : '',
    };
  }

  const symbols = matrix.assetIds;
  const rows: CorrelationCellVM[][] = symbols.map((a, i) =>
    symbols.map((b, j) => {
      const isDiagonal = i === j;
      const value = isDiagonal ? 1 : matrix.matrix[i]?.[j] ?? null;
      const available = value !== null;
      const display = isDiagonal ? '1.00' : available ? value!.toFixed(2) : '—';
      const ariaLabel = isDiagonal
        ? `${a} with itself: 1.00`
        : available
          ? `${a} vs ${b}: correlation ${value!.toFixed(2)}`
          : `${a} vs ${b}: insufficient overlapping history`;
      return { a, b, value, display, available, isDiagonal, ariaLabel };
    }),
  );

  return {
    available: true,
    emptyReason: null,
    symbols,
    names: result.labels,
    rows,
    coverageLabel: `${matrix.coverage.computedPairs} of ${matrix.coverage.totalPairs} pairs computed`,
    windowLabel: `${matrix.window}-session ${matrix.returnKind} returns`,
    asOfLabel: formatAsOf(matrix.generatedAt),
  };
}
