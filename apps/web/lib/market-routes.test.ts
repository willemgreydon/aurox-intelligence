import { describe, expect, it } from 'vitest';
import { getAssetInspectHref } from './market-routes';

describe('getAssetInspectHref', () => {
  it('routes crypto symbols to invest crypto lane', () => {
    expect(getAssetInspectHref({ symbol: 'BTC', assetClass: 'crypto' })).toBe('/invest/crypto?symbol=BTC');
  });

  it('routes stocks to invest stocks lane', () => {
    expect(getAssetInspectHref({ symbol: 'AAPL', assetClass: 'stock' })).toBe('/invest/stocks?symbol=AAPL');
  });

  it('routes etfs to invest etf lane', () => {
    expect(getAssetInspectHref({ symbol: 'SPY', assetClass: 'etf' })).toBe('/invest/etfs?symbol=SPY');
  });

  it('falls back to market for unknown classes', () => {
    expect(getAssetInspectHref({ symbol: 'DXY', assetClass: 'other' })).toBe('/market?symbol=DXY');
  });
});
