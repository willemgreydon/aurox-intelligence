import { describe, expect, it } from 'vitest';
import {
  detectCanonicalAssetKind,
  normalizeMarketSymbol,
  resolveCoinGeckoId,
  resolveEodhdSymbol,
  resolveFinnhubSymbol,
  resolvePolygonSymbol,
  resolveTwelveDataSymbol,
} from '../market/provider-symbols-source';

describe('normalizeMarketSymbol', () => {
  it('passes BINANCE: prefix through unchanged (pair already normalized)', () => {
    expect(normalizeMarketSymbol('BINANCE:BTCUSDT')).toBe('BINANCE:BTCUSDT');
    expect(normalizeMarketSymbol('BINANCE:ETHUSDT')).toBe('BINANCE:ETHUSDT');
    expect(normalizeMarketSymbol('BINANCE:SOLUSDT')).toBe('BINANCE:SOLUSDT');
  });

  it('normalizes BTC-USD / BTC/USD dashed crypto pairs to BINANCE: format', () => {
    expect(normalizeMarketSymbol('BTC-USD')).toBe('BINANCE:BTCUSDT');
    expect(normalizeMarketSymbol('ETH-USD')).toBe('BINANCE:ETHUSDT');
    expect(normalizeMarketSymbol('SOL/USD')).toBe('BINANCE:SOLUSDT');
    expect(normalizeMarketSymbol('BTC-USDT')).toBe('BINANCE:BTCUSDT');
    expect(normalizeMarketSymbol('ETH/USDT')).toBe('BINANCE:ETHUSDT');
  });

  it('normalizes concatenated crypto strings to BINANCE: format', () => {
    expect(normalizeMarketSymbol('BTCUSDT')).toBe('BINANCE:BTCUSDT');
    expect(normalizeMarketSymbol('ETHUSDT')).toBe('BINANCE:ETHUSDT');
  });

  it('strips .US suffix from equity symbols', () => {
    expect(normalizeMarketSymbol('AAPL.US')).toBe('AAPL');
    expect(normalizeMarketSymbol('MSFT.US')).toBe('MSFT');
  });

  it('leaves plain equity symbols unchanged', () => {
    expect(normalizeMarketSymbol('SPY')).toBe('SPY');
    expect(normalizeMarketSymbol('QQQ')).toBe('QQQ');
    expect(normalizeMarketSymbol('AAPL')).toBe('AAPL');
  });

  it('handles lowercase input', () => {
    expect(normalizeMarketSymbol('btcusdt')).toBe('BINANCE:BTCUSDT');
    expect(normalizeMarketSymbol('spy')).toBe('SPY');
  });

  it('handles whitespace', () => {
    expect(normalizeMarketSymbol(' AAPL ')).toBe('AAPL');
    expect(normalizeMarketSymbol(' BTC-USD ')).toBe('BINANCE:BTCUSDT');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeMarketSymbol('')).toBe('');
    expect(normalizeMarketSymbol('   ')).toBe('');
  });
});

describe('detectCanonicalAssetKind', () => {
  it('detects crypto from BINANCE: prefix', () => {
    expect(detectCanonicalAssetKind('BINANCE:BTCUSDT')).toBe('crypto');
    expect(detectCanonicalAssetKind('BINANCE:ETHUSDT')).toBe('crypto');
    expect(detectCanonicalAssetKind('BINANCE:SOLUSDT')).toBe('crypto');
  });

  it('detects ETF for known ETF symbols', () => {
    expect(detectCanonicalAssetKind('SPY')).toBe('etf');
    expect(detectCanonicalAssetKind('QQQ')).toBe('etf');
    expect(detectCanonicalAssetKind('IWM')).toBe('etf');
    expect(detectCanonicalAssetKind('VTI')).toBe('etf');
    expect(detectCanonicalAssetKind('GLD')).toBe('etf');
  });

  it('detects stock for unknown plain symbols', () => {
    expect(detectCanonicalAssetKind('AAPL')).toBe('stock');
    expect(detectCanonicalAssetKind('MSFT')).toBe('stock');
    expect(detectCanonicalAssetKind('NVDA')).toBe('stock');
  });

  it('detects crypto from dashed pair input', () => {
    expect(detectCanonicalAssetKind('BTC-USD')).toBe('crypto');
    expect(detectCanonicalAssetKind('ETH/USDT')).toBe('crypto');
  });
});

describe('resolveCoinGeckoId', () => {
  it('maps canonical BINANCE: symbols to CoinGecko IDs', () => {
    expect(resolveCoinGeckoId('BINANCE:BTCUSDT')).toBe('bitcoin');
    expect(resolveCoinGeckoId('BINANCE:ETHUSDT')).toBe('ethereum');
    expect(resolveCoinGeckoId('BINANCE:SOLUSDT')).toBe('solana');
    expect(resolveCoinGeckoId('BINANCE:ADAUSDT')).toBe('cardano');
    expect(resolveCoinGeckoId('BINANCE:DOGEUSDT')).toBe('dogecoin');
    expect(resolveCoinGeckoId('BINANCE:LINKUSDT')).toBe('chainlink');
  });

  it('maps bare BTC/ETH/SOL shorthand', () => {
    expect(resolveCoinGeckoId('BTC')).toBe('bitcoin');
    expect(resolveCoinGeckoId('ETH')).toBe('ethereum');
    expect(resolveCoinGeckoId('SOL')).toBe('solana');
  });

  it('returns null for unknown symbols', () => {
    expect(resolveCoinGeckoId('UNKNOWN:FOOBAR')).toBeNull();
    expect(resolveCoinGeckoId('SPY')).toBeNull();
  });
});

describe('resolvePolygonSymbol', () => {
  it('returns plain symbol for stock/ETF', () => {
    expect(resolvePolygonSymbol('AAPL')).toBe('AAPL');
    expect(resolvePolygonSymbol('SPY')).toBe('SPY');
    expect(resolvePolygonSymbol('QQQ')).toBe('QQQ');
  });

  it('returns null for crypto symbols (Polygon does not support crypto)', () => {
    expect(resolvePolygonSymbol('BINANCE:BTCUSDT')).toBeNull();
    expect(resolvePolygonSymbol('BTC-USD')).toBeNull();
  });
});

describe('resolveTwelveDataSymbol', () => {
  it('converts crypto BINANCE: format to base/quote slash format', () => {
    expect(resolveTwelveDataSymbol('BINANCE:BTCUSDT')).toBe('BTC/USD');
    expect(resolveTwelveDataSymbol('BINANCE:ETHUSDT')).toBe('ETH/USD');
  });

  it('returns plain symbol for equities', () => {
    expect(resolveTwelveDataSymbol('AAPL')).toBe('AAPL');
    expect(resolveTwelveDataSymbol('SPY')).toBe('SPY');
  });
});

describe('resolveEodhdSymbol', () => {
  it('converts BINANCE: crypto to base-quote.CC format', () => {
    expect(resolveEodhdSymbol('BINANCE:BTCUSDT')).toBe('BTC-USD.CC');
    expect(resolveEodhdSymbol('BINANCE:ETHUSDT')).toBe('ETH-USD.CC');
  });

  it('appends .US suffix for equities', () => {
    expect(resolveEodhdSymbol('AAPL')).toBe('AAPL.US');
    expect(resolveEodhdSymbol('SPY')).toBe('SPY.US');
  });
});

describe('resolveFinnhubSymbol', () => {
  it('returns BINANCE: format for crypto', () => {
    expect(resolveFinnhubSymbol('BINANCE:BTCUSDT')).toBe('BINANCE:BTCUSDT');
    expect(resolveFinnhubSymbol('BINANCE:ETHUSDT')).toBe('BINANCE:ETHUSDT');
  });

  it('returns plain symbol for equities and ETFs', () => {
    expect(resolveFinnhubSymbol('AAPL')).toBe('AAPL');
    expect(resolveFinnhubSymbol('SPY')).toBe('SPY');
  });
});
