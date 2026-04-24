import { describe, expect, it } from 'vitest';
import { canonicalizeIngestionRecord, canonicalizeSymbol } from '../canonicalize';

describe('canonicalizeSymbol', () => {
  it('normalizes BINANCE symbol variants', () => {
    expect(canonicalizeSymbol('btc-usd')).toBe('BINANCE:BTCUSDT');
  });

  it('normalizes equity suffixes', () => {
    expect(canonicalizeSymbol('aapl.us')).toBe('AAPL');
  });
});

describe('canonicalizeIngestionRecord', () => {
  it('maps provider payload to canonical record', () => {
    const record = canonicalizeIngestionRecord({
      symbol: 'ethusd',
      provider: 'Polygon',
      observedAt: '2026-01-02T03:04:05.000Z',
      price: 3000.42,
      changePercent: 1.12,
    });

    expect(record.canonicalSymbol).toBe('BINANCE:ETHUSDT');
    expect(record.provider).toBe('polygon');
    expect(record.assetKind).toBe('crypto');
    expect(record.price).toBe(3000.42);
    expect(record.changePercent).toBe(1.12);
  });
});

