import { describe, expect, it } from 'vitest';
import { resolveInspectHref } from './inspect-link';

describe('resolveInspectHref', () => {
  it('returns inspect link when symbol exists', () => {
    expect(resolveInspectHref({ symbol: 'AAPL', assetClass: 'stock' })).toBe('/invest/stocks?symbol=AAPL');
  });

  it('returns null when symbol is missing', () => {
    expect(resolveInspectHref({ symbol: '', assetClass: 'stock' })).toBeNull();
  });
});
