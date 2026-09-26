import type { CandleTimeframe } from '@repo/api-contracts';

/**
 * Raw OHLCV input to the candlestick engine. Mirrors the shape of
 * `@repo/providers` HistoricalBar / apps-web OhlcvBar so callers can pass their
 * existing bars directly. The engine sanitizes/validates internally.
 */
export interface CandleBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

/** Minimum bars for a meaningful structural read; below this we return insufficient-data. */
export const CANDLE_MIN_BARS = 20;

/** Trailing window used for relative range / relative volume baselines. */
export const RELATIVE_LOOKBACK = 14;

/** Number of recent candles surfaced in the intelligence output sequence. */
export const RECENT_SEQUENCE_LENGTH = 8;

export const SUPPORTED_TIMEFRAMES: readonly CandleTimeframe[] = ['daily', 'weekly', 'monthly'];
