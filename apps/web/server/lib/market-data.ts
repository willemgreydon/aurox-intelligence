import type { FreshnessState, TrendDirection } from '@repo/api-contracts';

type TimestampLike = string | null | undefined;

type MoveLike = {
  changePercent?: number | null | undefined;
};

export function getTrendDirection(changePercent: number | null | undefined): TrendDirection {
  const value = changePercent ?? 0;

  if (value > 0.05) {
    return 'up';
  }

  if (value < -0.05) {
    return 'down';
  }

  return 'flat';
}

type AssetClassHint = 'stock' | 'etf' | 'crypto' | 'fx' | 'index' | null | undefined;

function isStockMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;
  // NYSE: 14:30–21:00 UTC (9:30 AM–4:00 PM ET)
  return totalMinutes >= 870 && totalMinutes < 1260;
}

export function getFreshnessState(timestamp: TimestampLike, assetClass?: AssetClassHint): FreshnessState {
  if (!timestamp) {
    return 'unavailable';
  }

  const parsed = new Date(timestamp).getTime();

  if (Number.isNaN(parsed)) {
    return 'partial';
  }

  const ageMs = Date.now() - parsed;
  const ageMinutes = ageMs / (60 * 1000);
  const isCrypto = assetClass === 'crypto';

  if (ageMinutes <= 20) {
    return 'live';
  }

  if (ageMinutes <= 120) {
    // For stocks/ETFs outside market hours, a recent cached quote is expected
    if (!isCrypto && !isStockMarketOpen()) {
      return 'cached';
    }
    return 'delayed';
  }

  if (ageMinutes <= 24 * 60) {
    // For stocks/ETFs on weekend or after-hours with <24h old data
    if (!isCrypto && !isStockMarketOpen()) {
      return 'market_closed';
    }
    return 'stale';
  }

  return 'partial';
}

export function getLatestTimestamp(
  observations: Array<{ timestamp: TimestampLike }>,
): string | null {
  const timestamps = observations
    .map((item) => item.timestamp ?? null)
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? null : { value, time };
    })
    .filter((value): value is { value: string; time: number } => value !== null)
    .sort((a, b) => a.time - b.time);

  return timestamps.at(-1)?.value ?? null;
}

export function groupAverageMove<T extends MoveLike>(items: T[]): number | null {
  const values = items
    .map((item) => item.changePercent ?? null)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

export function formatSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Partial';
  }

  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatSignedAbsolute(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Partial';
  }

  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

export function getFreshnessLabel(state: FreshnessState): string {
  switch (state) {
    case 'live':
      return 'Live';
    case 'delayed':
      return 'Delayed';
    case 'cached':
      return 'Cached';
    case 'market_closed':
      return 'Market closed';
    case 'stale':
      return 'Stale';
    case 'partial':
      return 'Partial';
    case 'unavailable':
    default:
      return 'Unavailable';
  }
}
