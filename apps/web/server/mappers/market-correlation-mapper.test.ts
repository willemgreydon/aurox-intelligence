import { describe, expect, it } from 'vitest';
import { mapMarketCorrelation } from './market-correlation-mapper';
import type { MarketCorrelationResult } from '../services/market-correlation-service';
import type { CorrelationMatrix } from '@repo/api-contracts';

const AS_OF = '2026-01-15T12:00:00.000Z';

function result(matrix: CorrelationMatrix | null, labels: Record<string, string> = {}): MarketCorrelationResult {
  return { matrix, labels };
}

const MATRIX: CorrelationMatrix = {
  assetIds: ['AAPL', 'MSFT', 'GLD'],
  matrix: [
    [1, 0.72, null],
    [0.72, 1, -0.31],
    [null, -0.31, 1],
  ],
  pairs: [],
  method: 'pearson',
  returnKind: 'log',
  window: 60,
  minObservations: 30,
  coverage: { totalPairs: 3, computedPairs: 2, blockedPairs: 1 },
  generatedAt: AS_OF,
};

describe('mapMarketCorrelation', () => {
  it('is unavailable when there is no matrix', () => {
    const vm = mapMarketCorrelation(result(null));
    expect(vm.available).toBe(false);
    expect(vm.emptyReason).toMatch(/not enough overlapping/i);
    expect(vm.rows).toHaveLength(0);
  });

  it('is unavailable for a single-asset matrix', () => {
    const vm = mapMarketCorrelation(
      result({ ...MATRIX, assetIds: ['AAPL'], matrix: [[1]], coverage: { totalPairs: 0, computedPairs: 0, blockedPairs: 0 } }),
    );
    expect(vm.available).toBe(false);
  });

  it('builds an N×N grid with a unit diagonal', () => {
    const vm = mapMarketCorrelation(result(MATRIX, { AAPL: 'Apple', MSFT: 'Microsoft', GLD: 'Gold' }));
    expect(vm.available).toBe(true);
    expect(vm.symbols).toEqual(['AAPL', 'MSFT', 'GLD']);
    expect(vm.rows).toHaveLength(3);
    expect(vm.rows[0]).toHaveLength(3);
    // diagonal
    expect(vm.rows[0]![0]!.isDiagonal).toBe(true);
    expect(vm.rows[0]![0]!.value).toBe(1);
    expect(vm.rows[0]![0]!.display).toBe('1.00');
  });

  it('formats computed off-diagonal cells and surfaces unavailable pairs honestly', () => {
    const vm = mapMarketCorrelation(result(MATRIX));
    const aaplMsft = vm.rows[0]![1]!;
    expect(aaplMsft.available).toBe(true);
    expect(aaplMsft.display).toBe('0.72');

    const aaplGld = vm.rows[0]![2]!;
    expect(aaplGld.available).toBe(false);
    expect(aaplGld.value).toBeNull();
    expect(aaplGld.display).toBe('—');
    expect(aaplGld.ariaLabel).toMatch(/insufficient overlapping history/i);
  });

  it('reports coverage and window labels', () => {
    const vm = mapMarketCorrelation(result(MATRIX));
    expect(vm.coverageLabel).toBe('2 of 3 pairs computed');
    expect(vm.windowLabel).toBe('60-session log returns');
  });
});
