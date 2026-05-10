import { beforeEach, describe, expect, it, vi } from 'vitest';

const getInvestmentUniverseMock = vi.fn();
const getMarketHistoryBarsBySymbolsMock = vi.fn();
const loadQuoteSnapshotsMock = vi.fn();
const loadHistoryBarsMock = vi.fn();

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('@repo/db', () => ({
  getInvestmentUniverse: (...args: unknown[]) => getInvestmentUniverseMock(...args),
  getMarketHistoryBarsBySymbols: (...args: unknown[]) => getMarketHistoryBarsBySymbolsMock(...args),
}));

vi.mock('./stock-simulation-service', () => ({
  loadQuoteSnapshots: (...args: unknown[]) => loadQuoteSnapshotsMock(...args),
  loadHistoryBars: (...args: unknown[]) => loadHistoryBarsMock(...args),
}));

// Helpers to build realistic bar fixtures.
function makeDailyBars(symbol: string, count: number, endDateIso: string) {
  const end = new Date(endDateIso).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Array.from({ length: count }, (_, i) => ({
    symbol,
    timestamp: new Date(end - (count - 1 - i) * DAY_MS).toISOString(),
    open: 100 + i * 0.5,
    high: 102 + i * 0.5,
    low: 99 + i * 0.5,
    close: 101 + i * 0.5,
    volume: 1000,
    source: 'test',
  }));
}

describe('getMarketGraphData', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('fetches provider history when DB history is missing', async () => {
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '1', symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', assetClass: 'crypto' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({});
    loadQuoteSnapshotsMock.mockResolvedValue([{ symbol: 'BINANCE:BTCUSDT', source: 'coingecko', price: 60000 }]);
    loadHistoryBarsMock.mockResolvedValue([
      { symbol: 'BINANCE:BTCUSDT', timestamp: '2026-05-01T00:00:00.000Z', open: 1, high: 2, low: 1, close: 2, volume: 10, source: 'coingecko' },
    ]);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ assetClass: 'crypto', preferredSymbols: ['BINANCE:BTCUSDT'], limit: 1 });
    expect(loadHistoryBarsMock).toHaveBeenCalledWith('BINANCE:BTCUSDT', expect.any(Number), expect.any(String));
    expect(result.assets[0]?.history.length).toBeGreaterThan(0);
  });

  it('fetches ETF history when DB history is missing', async () => {
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '2', symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', assetClass: 'etf' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({});
    loadQuoteSnapshotsMock.mockResolvedValue([{ symbol: 'SPY', source: 'finnhub', price: 500 }]);
    loadHistoryBarsMock.mockResolvedValue([
      { symbol: 'SPY', timestamp: '2026-05-01T00:00:00.000Z', open: 500, high: 505, low: 499, close: 503, volume: 12, source: 'finnhub' },
    ]);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ assetClass: 'etf', preferredSymbols: ['SPY'], limit: 1 });
    expect(loadHistoryBarsMock).toHaveBeenCalledWith('SPY', expect.any(Number), expect.any(String));
    expect(result.assets[0]?.history.length).toBe(1);
  });

  it('does not synthesize fake bars when provider history fetch fails', async () => {
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '3', symbol: 'QQQ', name: 'Invesco QQQ Trust', assetClass: 'etf' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({});
    loadQuoteSnapshotsMock.mockResolvedValue([{ symbol: 'QQQ', source: 'finnhub', price: 450 }]);
    loadHistoryBarsMock.mockRejectedValue(new Error('provider unavailable'));

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ assetClass: 'etf', preferredSymbols: ['QQQ'], limit: 1 });
    expect(loadHistoryBarsMock).toHaveBeenCalledWith('QQQ', expect.any(Number), expect.any(String));
    expect(result.assets[0]?.history).toEqual([]);
  });

  it('returns meta with selectedTimeframe matching the option', async () => {
    const bars = makeDailyBars('AAPL', 90, '2026-05-09T00:00:00.000Z');
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '4', symbol: 'AAPL', name: 'Apple Inc', assetClass: 'stock' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({ AAPL: bars });
    loadQuoteSnapshotsMock.mockResolvedValue([{ symbol: 'AAPL', source: 'polygon', price: 185, changePercent: 1.2 }]);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '1M' });
    expect(result.meta.selectedTimeframe).toBe('1M');
  });

  it('1M returns fewer bars than 3M when history is long enough', async () => {
    const bars = makeDailyBars('AAPL', 365, '2026-05-09T00:00:00.000Z');
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '4', symbol: 'AAPL', name: 'Apple Inc', assetClass: 'stock' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({ AAPL: bars });
    loadQuoteSnapshotsMock.mockResolvedValue([]);

    const mod = await import('./market-graph-service');
    const result1M = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '1M' });
    const result3M = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '3M' });
    // meta.pointCount reflects the server-side slice used for metadata only
    expect(result1M.meta.pointCount).toBeLessThan(result3M.meta.pointCount);
    // history now carries the full bar set so client can slice for any timeframe
    expect(result1M.assets[0]!.history.length).toBe(result3M.assets[0]!.history.length);
  });

  it('intraday timeframe with daily bars produces isDegraded=false but isFallback=true', async () => {
    // Give it more than the degradedThreshold (10) bars so isDegraded stays false.
    const bars = makeDailyBars('AAPL', 30, '2026-05-09T00:00:00.000Z');
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '4', symbol: 'AAPL', name: 'Apple Inc', assetClass: 'stock' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({ AAPL: bars });
    loadQuoteSnapshotsMock.mockResolvedValue([]);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '1m' });
    // isFallback because daily bars were used for an intraday request
    expect(result.meta.isFallback).toBe(true);
    expect(result.meta.fallbackReason).toMatch(/Intraday .* bars unavailable/i);
    expect(loadHistoryBarsMock).toHaveBeenCalledWith('AAPL', expect.any(Number), '1m');
  });

  it('returns isDegraded=true with a degradedReason when bar count is below threshold', async () => {
    // 2Y needs 100 bars. Give only 5 to trigger degraded.
    const bars = makeDailyBars('AAPL', 5, '2026-05-09T00:00:00.000Z');
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '4', symbol: 'AAPL', name: 'Apple Inc', assetClass: 'stock' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({ AAPL: bars });
    loadQuoteSnapshotsMock.mockResolvedValue([]);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '2Y' });
    expect(result.meta.isDegraded).toBe(true);
    expect(result.meta.degradedReason).toBeTruthy();
  });

  it('meta includes totalBarsInCache', async () => {
    const bars = makeDailyBars('AAPL', 90, '2026-05-09T00:00:00.000Z');
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '4', symbol: 'AAPL', name: 'Apple Inc', assetClass: 'stock' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({ AAPL: bars });
    loadQuoteSnapshotsMock.mockResolvedValue([]);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '1M' });
    expect(result.meta.totalBarsInCache).toBe(90);
  });

  it('meta.actualResolution is daily for daily bars', async () => {
    const bars = makeDailyBars('AAPL', 90, '2026-05-09T00:00:00.000Z');
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '4', symbol: 'AAPL', name: 'Apple Inc', assetClass: 'stock' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({ AAPL: bars });
    loadQuoteSnapshotsMock.mockResolvedValue([]);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '1Y' });
    expect(result.meta.actualResolution).toBe('daily');
  });

  it('result.assets contains barPoints with open/high/low/close/volume', async () => {
    const bars = makeDailyBars('AAPL', 30, '2026-05-09T00:00:00.000Z');
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '4', symbol: 'AAPL', name: 'Apple Inc', assetClass: 'stock' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({ AAPL: bars });
    loadQuoteSnapshotsMock.mockResolvedValue([]);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '1M' });
    const firstBar = result.assets[0]?.history[0];
    expect(firstBar).toBeDefined();
    expect(typeof firstBar?.open).toBe('number');
    expect(typeof firstBar?.high).toBe('number');
    expect(typeof firstBar?.low).toBe('number');
    expect(typeof firstBar?.close).toBe('number');
  });

  it('meta includes requestedStart, actualStart, and coverageRatio', async () => {
    const bars = makeDailyBars('AAPL', 90, '2026-05-09T00:00:00.000Z');
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '4', symbol: 'AAPL', name: 'Apple Inc', assetClass: 'stock' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({ AAPL: bars });
    loadQuoteSnapshotsMock.mockResolvedValue([]);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '1M' });
    expect(result.meta.requestedStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.meta.actualStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.meta.coverageRatio).toBeGreaterThan(0);
    expect(result.meta.coverageRatio).toBeLessThanOrEqual(1);
  });

  it('2Y with only 90 bars sets isDegraded=true and coverageRatio < 0.75', async () => {
    // 90 bars ≈ 4.5 months of trading days — far short of 2Y (730 calendar days)
    const bars = makeDailyBars('AAPL', 90, '2026-05-09T00:00:00.000Z');
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '4', symbol: 'AAPL', name: 'Apple Inc', assetClass: 'stock' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({ AAPL: bars });
    loadQuoteSnapshotsMock.mockResolvedValue([]);
    loadHistoryBarsMock.mockResolvedValue(bars);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '2Y' });
    expect(result.meta.isDegraded).toBe(true);
    expect(result.meta.coverageRatio).toBeLessThan(0.75);
    expect(result.meta.degradedReason).toBeTruthy();
    expect(result.meta.backfillAttempted).toBe(true);
  });

  it('2Y with 730 bars has coverageRatio >= 0.75 and isDegraded=false', async () => {
    // 730 calendar-day bars span exactly 2 years — full coverage for 2Y window
    const bars = makeDailyBars('AAPL', 730, '2026-05-09T00:00:00.000Z');
    getInvestmentUniverseMock.mockResolvedValue([
      { assetId: '4', symbol: 'AAPL', name: 'Apple Inc', assetClass: 'stock' },
    ]);
    getMarketHistoryBarsBySymbolsMock.mockResolvedValue({ AAPL: bars });
    loadQuoteSnapshotsMock.mockResolvedValue([]);

    const mod = await import('./market-graph-service');
    const result = await mod.getMarketGraphData({ preferredSymbols: ['AAPL'], limit: 1, timeframe: '2Y' });
    expect(result.meta.coverageRatio).toBeGreaterThanOrEqual(0.75);
    expect(result.meta.isDegraded).toBe(false);
  });
});
