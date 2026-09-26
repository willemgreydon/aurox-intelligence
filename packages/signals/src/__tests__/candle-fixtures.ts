// Deterministic OHLCV fixtures for the candlestick engine. No Math.random(),
// no Date.now() — timestamps are derived from a fixed epoch so every series is
// reproducible and expected outputs can be asserted exactly (test-data-rule.md).
import type { CandleBar } from '../candles/types';

const EPOCH = Date.UTC(2025, 0, 1); // fixed anchor
const DAY_MS = 86_400_000;

export interface BarSpec {
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number | null;
}

/** Build daily bars with sequential UTC timestamps from the fixed epoch. */
export function mkBars(specs: BarSpec[], startIndex = 0): CandleBar[] {
  return specs.map((s, i) => ({
    timestamp: new Date(EPOCH + (startIndex + i) * DAY_MS).toISOString(),
    open: s.o,
    high: s.h,
    low: s.l,
    close: s.c,
    volume: s.v === undefined ? 1_000 : s.v,
  }));
}

/** A flat/quiet base of `count` doji-ish bars around `price` (no trend). */
export function flatBase(count: number, price = 100, volume = 1_000): BarSpec[] {
  return Array.from({ length: count }, () => ({ o: price, h: price + 0.5, l: price - 0.5, c: price, v: volume }));
}

/** A monotonic up series of `count` bullish bars starting at `start`, step per bar. */
export function upSeries(count: number, start = 100, step = 2, volume = 1_000): BarSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const open = start + i * step;
    const close = open + step * 0.8;
    return { o: open, h: close + step * 0.2, l: open - step * 0.1, c: close, v: volume };
  });
}

/** A monotonic down series of `count` bearish bars starting at `start`. */
export function downSeries(count: number, start = 160, step = 2, volume = 1_000): BarSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const open = start - i * step;
    const close = open - step * 0.8;
    return { o: open, h: open + step * 0.1, l: close - step * 0.2, c: close, v: volume };
  });
}

/** A zig-zag series producing alternating swing highs/lows around `mid`. */
export function zigzag(count: number, mid = 100, amp = 8): BarSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const phase = i % 4;
    const c = phase === 0 ? mid + amp : phase === 2 ? mid - amp : mid;
    const o = i === 0 ? mid : mid;
    return { o, h: Math.max(o, c) + 1, l: Math.min(o, c) - 1, c, v: 1_000 };
  });
}
