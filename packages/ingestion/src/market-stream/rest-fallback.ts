import type { MarketHistoryResolution } from './capabilities';

export type TickerSnapshot = {
  provider: string;
  symbol: string;
  price: number | null;
  observedAt: string | null;
  degraded: boolean;
  reason: string | null;
};

export type HistoricalSnapshot = {
  provider: string;
  symbol: string;
  resolution: MarketHistoryResolution;
  bars: Array<{ timestamp: string; open: number; high: number; low: number; close: number; volume?: number }>;
  degraded: boolean;
  reason: string | null;
};

export type FundingRateSnapshot = {
  provider: string;
  symbol: string;
  fundingRate: number | null;
  predictedFundingRate: number | null;
  fundingTime: string | null;
  degraded: boolean;
  reason: string | null;
};

export type OpenInterestSnapshot = {
  provider: string;
  symbol: string;
  openInterest: number | null;
  observedAt: string | null;
  degraded: boolean;
  reason: string | null;
};

export async function fetchLatestTickerSnapshot(symbol: string, provider = 'local-cache'): Promise<TickerSnapshot> {
  return {
    provider,
    symbol,
    price: null,
    observedAt: null,
    degraded: true,
    reason: 'REST ticker fallback placeholder. Integrate provider client in worker/web service layer.',
  };
}

export async function fetchHistoricalCandles(
  symbol: string,
  resolution: MarketHistoryResolution,
  provider = 'local-cache',
): Promise<HistoricalSnapshot> {
  return {
    provider,
    symbol,
    resolution,
    bars: [],
    degraded: true,
    reason: 'REST historical fallback placeholder. Integrate provider client in worker/web service layer.',
  };
}

export async function fetchFundingRateFallback(
  provider: 'binance' | 'bybit' | 'okx',
  symbol: string,
): Promise<FundingRateSnapshot> {
  return {
    provider,
    symbol,
    fundingRate: null,
    predictedFundingRate: null,
    fundingTime: null,
    degraded: true,
    reason: 'Funding REST fallback not yet wired for this provider in this slice.',
  };
}

export async function fetchOpenInterestFallback(
  provider: 'binance' | 'bybit' | 'okx',
  symbol: string,
): Promise<OpenInterestSnapshot> {
  return {
    provider,
    symbol,
    openInterest: null,
    observedAt: null,
    degraded: true,
    reason: 'Open interest REST fallback not yet wired for this provider in this slice.',
  };
}
