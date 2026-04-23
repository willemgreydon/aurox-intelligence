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

export function getFreshnessState(timestamp: TimestampLike): FreshnessState {
  if (!timestamp) {
    return 'unavailable';
  }

  const parsed = new Date(timestamp).getTime();

  if (Number.isNaN(parsed)) {
    return 'partial';
  }

  const ageMs = Date.now() - parsed;
  const ageMinutes = ageMs / (60 * 1000);

  if (ageMinutes <= 20) {
    return 'live';
  }

  if (ageMinutes <= 120) {
    return 'delayed';
  }

  if (ageMinutes <= 24 * 60) {
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
    case 'stale':
      return 'Stale';
    case 'partial':
      return 'Partial';
    case 'unavailable':
    default:
      return 'Unavailable';
  }
}
