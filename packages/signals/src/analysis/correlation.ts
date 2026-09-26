import type {
  CorrelationMatrix,
  CorrelationMethod,
  CorrelationPair,
  CorrelationReturnKind,
  CorrelationUnavailableReason,
} from '@repo/api-contracts';
import { clamp } from '../util/clamp';

/**
 * PURE cross-asset correlation engine. No I/O, no clock reads, no randomness.
 *
 * Correlation is computed from SYNCHRONIZED daily RETURNS, never raw price
 * levels (correlating price levels produces spurious results dominated by trend
 * and scale). For each asset pair we intersect timestamps, compute returns over
 * the aligned close series, take the most-recent `window` observations, and —
 * only if at least `minObservations` remain and neither return series is
 * constant — compute Pearson r. Otherwise the pair is reported as unavailable
 * with an explicit reason. Missing data is never filled with zero.
 */

export interface CorrelationBar {
  timestamp: string;
  close: number;
}

export interface CorrelationAssetSeries {
  assetId: string;
  /** Bars in ascending timestamp order. The engine sorts defensively. */
  bars: readonly CorrelationBar[];
}

export interface CorrelationOptions {
  /** Max most-recent aligned returns to use per pair. Default 60. */
  window?: number;
  /** Minimum overlapping return observations required. Default 30. */
  minObservations?: number;
  method?: CorrelationMethod;
  returnKind?: CorrelationReturnKind;
  /** Injected ISO timestamp — the engine never reads the clock. */
  generatedAt: string;
}

const DEFAULT_WINDOW = 60;
const DEFAULT_MIN_OBS = 30;

/** Return computed from an aligned close series (log by default). */
function toReturns(closes: readonly number[], kind: CorrelationReturnKind): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1]!;
    const curr = closes[i]!;
    if (kind === 'log') {
      // Log return requires strictly positive prices; anything else is dropped
      // (its index becomes non-finite and is filtered from both series later).
      out.push(prev > 0 && curr > 0 ? Math.log(curr / prev) : Number.NaN);
    } else {
      out.push(prev !== 0 ? curr / prev - 1 : Number.NaN);
    }
  }
  return out;
}

function pearson(x: readonly number[], y: readonly number[]): number | null {
  const n = x.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += x[i]!;
    sumY += y[i]!;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = x[i]! - meanX;
    const dy = y[i]! - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX <= 0 || varY <= 0) return null; // a constant series has no correlation
  const r = cov / Math.sqrt(varX * varY);
  return clamp(r, -1, 1);
}

type PairResult = { correlation: number | null; observations: number; reason: CorrelationUnavailableReason | null };

function correlatePair(
  a: readonly CorrelationBar[],
  b: readonly CorrelationBar[],
  window: number,
  minObservations: number,
  returnKind: CorrelationReturnKind,
): PairResult {
  // Intersect timestamps → maximal aligned overlap for THIS pair.
  const bByTs = new Map<string, number>();
  for (const bar of b) {
    if (Number.isFinite(bar.close)) bByTs.set(bar.timestamp, bar.close);
  }
  const alignedA: number[] = [];
  const alignedB: number[] = [];
  for (const bar of a) {
    if (!Number.isFinite(bar.close)) continue;
    const bClose = bByTs.get(bar.timestamp);
    if (bClose === undefined) continue;
    alignedA.push(bar.close);
    alignedB.push(bClose);
  }

  const retA = toReturns(alignedA, returnKind);
  const retB = toReturns(alignedB, returnKind);

  // Keep only indices where BOTH returns are finite (preserves pairing).
  const px: number[] = [];
  const py: number[] = [];
  for (let i = 0; i < retA.length; i += 1) {
    const ra = retA[i]!;
    const rb = retB[i]!;
    if (Number.isFinite(ra) && Number.isFinite(rb)) {
      px.push(ra);
      py.push(rb);
    }
  }

  // Most-recent window.
  const start = Math.max(0, px.length - window);
  const wx = px.slice(start);
  const wy = py.slice(start);

  if (wx.length < minObservations) {
    return { correlation: null, observations: wx.length, reason: 'insufficient_overlap' };
  }
  const r = pearson(wx, wy);
  if (r === null) {
    return { correlation: null, observations: wx.length, reason: 'constant_series' };
  }
  return { correlation: r, observations: wx.length, reason: null };
}

/**
 * Build a symmetric correlation matrix across the provided asset series.
 * Assets with fewer than 2 bars are still included (they simply produce
 * unavailable pairs). Determinism: same inputs → same output, always.
 */
export function computeCorrelationMatrix(
  series: readonly CorrelationAssetSeries[],
  options: CorrelationOptions,
): CorrelationMatrix {
  const window = options.window ?? DEFAULT_WINDOW;
  const minObservations = options.minObservations ?? DEFAULT_MIN_OBS;
  const method: CorrelationMethod = options.method ?? 'pearson';
  const returnKind: CorrelationReturnKind = options.returnKind ?? 'log';

  // Defensive ascending sort by timestamp; de-duplicate asset ids by first-win.
  const seen = new Set<string>();
  const normalized = series
    .filter((entry) => {
      if (seen.has(entry.assetId)) return false;
      seen.add(entry.assetId);
      return true;
    })
    .map((entry) => ({
      assetId: entry.assetId,
      bars: [...entry.bars].sort((l, r) => (l.timestamp < r.timestamp ? -1 : l.timestamp > r.timestamp ? 1 : 0)),
    }));

  const assetIds = normalized.map((entry) => entry.assetId);
  const n = assetIds.length;

  const matrix: (number | null)[][] = assetIds.map((_, i) =>
    assetIds.map((__, j) => (i === j ? 1 : null)),
  );
  const pairs: CorrelationPair[] = [];
  let computedPairs = 0;
  let blockedPairs = 0;

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const result = correlatePair(
        normalized[i]!.bars,
        normalized[j]!.bars,
        window,
        minObservations,
        returnKind,
      );
      matrix[i]![j] = result.correlation;
      matrix[j]![i] = result.correlation;
      const available = result.correlation !== null;
      if (available) computedPairs += 1;
      else blockedPairs += 1;
      pairs.push({
        a: assetIds[i]!,
        b: assetIds[j]!,
        correlation: result.correlation,
        observations: result.observations,
        available,
        reason: result.reason,
      });
    }
  }

  const totalPairs = (n * (n - 1)) / 2;

  return {
    assetIds,
    matrix,
    pairs,
    method,
    returnKind,
    window,
    minObservations,
    coverage: { totalPairs, computedPairs, blockedPairs },
    generatedAt: options.generatedAt,
  };
}
