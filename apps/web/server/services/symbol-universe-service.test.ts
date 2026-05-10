import { describe, expect, it } from 'vitest';
import { listSymbolUniverse } from './symbol-universe-service';

describe('listSymbolUniverse', () => {
  it('applies pagination and max page size guard', () => {
    const result = listSymbolUniverse({ pageSize: 999 });
    expect(result.pageSize).toBe(100);
    expect(result.rows.length).toBeLessThanOrEqual(100);
  });

  it('filters by asset class and search', () => {
    const result = listSymbolUniverse({ assetClass: 'crypto', search: 'BTC' });
    expect(result.rows.every((row) => row.assetClass === 'crypto')).toBe(true);
    expect(result.rows.some((row) => row.symbol.includes('BTC'))).toBe(true);
  });
});

