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
  // Resolve the current wall-clock time in US Eastern so DST (EST↔EDT) is handled
  // automatically — a fixed UTC window would be an hour off for ~8 months/year.
  // NYSE regular session is 09:30–16:00 ET, Mon–Fri. (Exchange holidays are not
  // modelled here; on a holiday this returns "open" during those hours — a minor
  // over-report that only affects freshness labelling, never execution.)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  const weekday = get('weekday');
  if (weekday === 'Sat' || weekday === 'Sun') return false;

  let hour = Number.parseInt(get('hour'), 10);
  if (hour === 24) hour = 0; // some ICU builds emit "24" for midnight
  const minute = Number.parseInt(get('minute'), 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;

  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 570 && totalMinutes < 960; // 09:30 (570) – 16:00 (960) ET
}

const EQUITY_ASSET_CLASSES = new Set<string>(['stock', 'etf', 'index', 'equity']);

/**
 * True when the asset trades on the US equity session and that session is
 * currently closed (weekend / outside NYSE hours). Crypto and FX trade 24/7 (or
 * on separate sessions) and always return false. Used to badge equity ticker
 * items as "market closed" rather than surfacing a misleading "N days ago"
 * freshness label when the last real quote is simply the previous session close.
 */
export function isEquityMarketClosed(assetClass?: string | null): boolean {
  if (!assetClass) return false;
  if (!EQUITY_ASSET_CLASSES.has(assetClass.toLowerCase())) return false;
  return !isStockMarketOpen();
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
