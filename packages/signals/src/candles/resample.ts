import type { CandleTimeframe } from '@repo/api-contracts';
import { isFiniteNumber } from '../util/clamp';
import type { CandleBar } from './types';

/**
 * Deterministically resample DAILY bars into weekly or monthly bars.
 *
 * The persisted history is daily granularity, so higher timeframes are DERIVED
 * (no extra provider calls, no fabricated intraday data). Weekly buckets are
 * Monday-anchored (UTC); monthly buckets are calendar-month (UTC). Bars are
 * assumed ascending by time; buckets aggregate open=first, close=last,
 * high=max, low=min, volume=sum (null if the whole bucket lacks volume).
 */

function bucketKey(timestamp: string, timeframe: CandleTimeframe): string | null {
  const date = new Date(timestamp);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return null;
  if (timeframe === 'monthly') {
    return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
  }
  // weekly — Monday-anchored day index.
  const dayIndex = Math.floor(ms / 86_400_000);
  const weekday = date.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = (weekday + 6) % 7;
  return String(dayIndex - mondayOffset);
}

export function resampleBars(bars: readonly CandleBar[], timeframe: CandleTimeframe): CandleBar[] {
  if (timeframe === 'daily') return bars.slice();
  if (bars.length === 0) return [];

  const out: CandleBar[] = [];
  let currentKey: string | null = null;
  let acc: CandleBar | null = null;
  let volumeSum = 0;
  let sawVolume = false;

  const flush = () => {
    if (acc) {
      out.push({ ...acc, volume: sawVolume ? volumeSum : null });
    }
  };

  for (const bar of bars) {
    const key = bucketKey(bar.timestamp, timeframe);
    if (key === null) continue;
    if (key !== currentKey) {
      flush();
      currentKey = key;
      acc = { timestamp: bar.timestamp, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: null };
      volumeSum = 0;
      sawVolume = false;
    } else if (acc) {
      acc.high = Math.max(acc.high, bar.high);
      acc.low = Math.min(acc.low, bar.low);
      acc.close = bar.close;
      acc.timestamp = bar.timestamp;
    }
    if (isFiniteNumber(bar.volume)) {
      volumeSum += bar.volume;
      sawVolume = true;
    }
  }
  flush();
  return out;
}
