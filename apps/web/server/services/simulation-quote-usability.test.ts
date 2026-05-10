import { describe, expect, it } from 'vitest';
import { evaluateSimulationQuoteUsability, extractSimulationPrice } from './simulation-quote-usability';

describe('simulation quote usability', () => {
  it('allows cached stock quote outside market hours', () => {
    const result = evaluateSimulationQuoteUsability({
      symbol: 'MSFT',
      assetClass: 'stock',
      quote: { price: 410.25, source: 'finnhub', observedAt: '2026-05-09T20:00:00.000Z' },
      now: new Date('2026-05-10T12:00:00.000Z'),
    });
    expect(result.usable).toBe(true);
    expect(result.reasonCode).toBe('CACHED_MARKET_CLOSED');
  });

  it('rejects too-old stock quote during market hours', () => {
    const result = evaluateSimulationQuoteUsability({
      symbol: 'MSFT',
      assetClass: 'stock',
      quote: { price: 410.25, source: 'finnhub', observedAt: '2026-05-11T12:00:00.000Z' },
      now: new Date('2026-05-11T16:00:00.000Z'),
    });
    expect(result.usable).toBe(false);
  });

  it('allows crypto live quote', () => {
    const result = evaluateSimulationQuoteUsability({
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      quote: { price: 62000, freshnessState: 'live', observedAt: '2026-05-10T10:00:00.000Z' },
      now: new Date('2026-05-10T10:00:30.000Z'),
    });
    expect(result.usable).toBe(true);
  });

  it('rejects crypto stale quote', () => {
    const result = evaluateSimulationQuoteUsability({
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      quote: { price: 62000, observedAt: '2026-05-10T09:00:00.000Z' },
      now: new Date('2026-05-10T10:10:00.000Z'),
    });
    expect(result.usable).toBe(false);
  });

  it('falls back to previousClose', () => {
    expect(extractSimulationPrice({ previousClose: 123.45 })).toBe(123.45);
  });

  it('falls back to bid-ask midpoint', () => {
    expect(extractSimulationPrice({ bid: 100, ask: 102 })).toBe(101);
  });
});
