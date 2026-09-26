import { describe, expect, it } from 'vitest';
import {
  computeCorrelationMatrix,
  type CorrelationAssetSeries,
} from '../analysis/correlation';

const GEN = '2026-01-01T00:00:00.000Z';

/** Build a series of `n` daily bars from an array of closes. */
function series(assetId: string, closes: number[]): CorrelationAssetSeries {
  return {
    assetId,
    bars: closes.map((close, index) => ({
      // zero-padded day so lexical sort == chronological
      timestamp: `2026-01-${String(index + 1).padStart(2, '0')}`,
      close,
    })),
  };
}

/** Compounding series from a fixed return path (deterministic, positive prices). */
function fromReturns(assetId: string, rets: number[], start = 100): CorrelationAssetSeries {
  const closes = [start];
  for (const r of rets) closes.push(closes[closes.length - 1]! * (1 + r));
  return series(assetId, closes);
}

describe('computeCorrelationMatrix', () => {
  const opts = { window: 60, minObservations: 3, generatedAt: GEN };

  it('gives +1 for identical return paths', () => {
    const rets = [0.01, -0.02, 0.03, 0.015, -0.01, 0.02];
    const m = computeCorrelationMatrix([fromReturns('A', rets), fromReturns('B', rets, 250)], opts);
    const pair = m.pairs.find((p) => p.a === 'A' && p.b === 'B')!;
    expect(pair.available).toBe(true);
    expect(pair.correlation).toBeCloseTo(1, 6);
    expect(m.matrix[0]![1]).toBeCloseTo(1, 6);
    expect(m.matrix[0]![0]).toBe(1); // diagonal
  });

  it('gives -1 for exactly inverse return paths (simple returns)', () => {
    // Simple returns r and -r are exact negatives, so correlation is exactly -1.
    // (With log returns ln(1+r) vs ln(1-r) are non-linear, so -1 is only approximate —
    //  that is mathematically correct, not a bug.)
    const rets = [0.01, -0.02, 0.03, 0.015, -0.01, 0.02];
    const inverse = rets.map((r) => -r);
    const m = computeCorrelationMatrix([fromReturns('A', rets), fromReturns('B', inverse)], {
      ...opts,
      returnKind: 'simple',
    });
    const pair = m.pairs[0]!;
    expect(m.returnKind).toBe('simple');
    expect(pair.correlation).toBeCloseTo(-1, 6);
  });

  it('flags a constant price series as unavailable (constant_series)', () => {
    const m = computeCorrelationMatrix(
      [fromReturns('A', [0.01, -0.02, 0.03, 0.01]), series('FLAT', [50, 50, 50, 50, 50])],
      opts,
    );
    const pair = m.pairs[0]!;
    expect(pair.available).toBe(false);
    expect(pair.correlation).toBeNull();
    expect(pair.reason).toBe('constant_series');
  });

  it('flags insufficient overlap rather than fabricating a value', () => {
    const a = series('A', [100, 101, 102, 103, 104, 105]);
    // Disjoint timestamps → zero overlap.
    const b: CorrelationAssetSeries = {
      assetId: 'B',
      bars: [
        { timestamp: '2026-02-01', close: 10 },
        { timestamp: '2026-02-02', close: 11 },
        { timestamp: '2026-02-03', close: 12 },
      ],
    };
    const m = computeCorrelationMatrix([a, b], opts);
    const pair = m.pairs[0]!;
    expect(pair.available).toBe(false);
    expect(pair.correlation).toBeNull();
    expect(pair.observations).toBe(0);
    expect(pair.reason).toBe('insufficient_overlap');
  });

  it('uses only overlapping timestamps for mismatched calendars', () => {
    // A has 6 points; B shares only the last 4 timestamps → 3 aligned returns.
    const a = series('A', [100, 101, 102, 103, 104, 105]);
    const b: CorrelationAssetSeries = {
      assetId: 'B',
      bars: [
        { timestamp: '2026-01-03', close: 200 },
        { timestamp: '2026-01-04', close: 202 },
        { timestamp: '2026-01-05', close: 204 },
        { timestamp: '2026-01-06', close: 206 },
      ],
    };
    const m = computeCorrelationMatrix([a, b], { ...opts, minObservations: 3 });
    const pair = m.pairs[0]!;
    expect(pair.observations).toBe(3); // 4 overlapping closes → 3 returns
    expect(pair.available).toBe(true);
  });

  it('reports coverage counts', () => {
    const m = computeCorrelationMatrix(
      [
        fromReturns('A', [0.01, -0.02, 0.03, 0.01]),
        fromReturns('B', [0.02, 0.01, -0.01, 0.02]),
        series('FLAT', [50, 50, 50, 50, 50]),
      ],
      opts,
    );
    expect(m.coverage.totalPairs).toBe(3); // A-B, A-FLAT, B-FLAT
    expect(m.coverage.computedPairs + m.coverage.blockedPairs).toBe(3);
    expect(m.coverage.blockedPairs).toBe(2); // both pairs with FLAT
  });

  it('is deterministic and symmetric', () => {
    const input = [fromReturns('A', [0.01, -0.02, 0.03, 0.01]), fromReturns('B', [0.02, 0.01, -0.01, 0.02])];
    const m1 = computeCorrelationMatrix(input, opts);
    const m2 = computeCorrelationMatrix(input, opts);
    expect(m1).toEqual(m2);
    expect(m1.matrix[0]![1]).toBe(m1.matrix[1]![0]);
    expect(m1.generatedAt).toBe(GEN);
  });

  it('clamps correlation into [-1, 1]', () => {
    const m = computeCorrelationMatrix(
      [fromReturns('A', [0.01, 0.02, 0.03, 0.04, 0.05]), fromReturns('B', [0.01, 0.02, 0.03, 0.04, 0.05])],
      opts,
    );
    for (const pair of m.pairs) {
      if (pair.correlation !== null) {
        expect(pair.correlation).toBeGreaterThanOrEqual(-1);
        expect(pair.correlation).toBeLessThanOrEqual(1);
      }
    }
  });
});
