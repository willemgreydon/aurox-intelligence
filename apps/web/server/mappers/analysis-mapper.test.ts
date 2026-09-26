import { describe, expect, it } from 'vitest';
import { mapForecastsPage, mapSignalsPage } from './analysis-mapper';
import type { AnalysisReadModel } from '../queries/analysis-query';

function buildHistory(symbol: string, closes: number[]) {
  return closes.map((close, index) => ({
    symbol,
    timestamp: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    open: close - 1,
    high: close + 1,
    low: close - 2,
    close,
    volume: 1_000_000,
    source: 'test',
  }));
}

// Deterministic, fixed closes (>= 10 bars so signals derive as nominal).
const CLOSES = [100, 101, 102, 101, 103, 104, 103, 105, 106, 107, 108, 109];

const READ_MODEL: AnalysisReadModel = {
  provider: 'test',
  providerError: null,
  dashboard: {
    dataSource: { configured: false, mode: 'stub' },
    assetCount: 0,
    latestObservationAt: null,
    latestForecastAt: null,
    latestIngestionCompletedAt: null,
    latestSuccessfulSyncAt: null,
    forecasts: [],
    ingestionRuns: [],
    providerSyncs: [],
  },
  assets: [
    {
      assetId: 'BINANCE:BTCUSDT',
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      observation: null,
      history: buildHistory('BINANCE:BTCUSDT', CLOSES),
    },
    {
      assetId: 'SPY',
      symbol: 'SPY',
      assetClass: 'stock',
      observation: null,
      history: buildHistory('SPY', CLOSES),
    },
  ],
};

describe('analysis-mapper asset class propagation', () => {
  it('carries crypto asset class through to forecasts (BINANCE:BTCUSDT is not a stock)', () => {
    const page = mapForecastsPage(READ_MODEL);
    const btc = page.forecasts.find((forecast) => forecast.assetId === 'BINANCE:BTCUSDT');
    const spy = page.forecasts.find((forecast) => forecast.assetId === 'SPY');

    expect(btc?.assetClass).toBe('crypto');
    expect(spy?.assetClass).toBe('stock');
  });

  it('carries asset class through to signals', () => {
    const page = mapSignalsPage(READ_MODEL);
    const btc = page.signals.find((signal) => signal.assetId === 'BINANCE:BTCUSDT');

    expect(btc?.assetClass).toBe('crypto');
  });
});
