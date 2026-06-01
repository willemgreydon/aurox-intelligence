import { describe, expect, it } from 'vitest';
import { getAssetInspectHref } from './market-routes';

describe('getAssetInspectHref', () => {
  // Asset classes with dedicated detail routes link to the per-symbol detail
  // page (not the list page with a ?symbol= highlight) so clicks land on the
  // exact asset, not a generic overview.
  it('routes crypto symbols to the crypto detail page', () => {
    expect(getAssetInspectHref({ symbol: 'BTC', assetClass: 'crypto' })).toBe('/invest/crypto/BTC');
  });

  it('routes stocks to the stock detail page', () => {
    expect(getAssetInspectHref({ symbol: 'AAPL', assetClass: 'stock' })).toBe('/invest/stocks/AAPL');
  });

  it('routes etfs to the etf detail page', () => {
    expect(getAssetInspectHref({ symbol: 'SPY', assetClass: 'etf' })).toBe('/invest/etfs/SPY');
  });

  it('falls back to market for unknown classes', () => {
    expect(getAssetInspectHref({ symbol: 'DXY', assetClass: 'other' })).toBe('/market?symbol=DXY');
  });

  it('routes macro assets to macro anchor view', () => {
    expect(getAssetInspectHref({ symbol: 'US10Y', assetClass: 'macro' })).toBe('/market?assetClass=macro&symbol=US10Y#macro');
  });
});
