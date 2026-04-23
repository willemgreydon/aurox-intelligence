const CHART_LOCALE = 'en-US' as const;
const CHART_TIMEZONE = 'UTC' as const;

export function formatChartMonthRange(
  startTimestamp: string | null,
  endTimestamp: string | null,
  fallback: string,
): string {
  if (!startTimestamp || !endTimestamp) return fallback;
  const start = new Date(startTimestamp);
  const end = new Date(endTimestamp);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return fallback;
  const fmt = new Intl.DateTimeFormat(CHART_LOCALE, { month: 'short', timeZone: CHART_TIMEZONE });
  return `${fmt.format(start)} \u2013 ${fmt.format(end)}`;
}

export function formatChartTooltipDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return timestamp.slice(0, 10);
  return new Intl.DateTimeFormat(CHART_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: CHART_TIMEZONE,
  }).format(date);
}

export function formatChartAxisDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(CHART_LOCALE, {
    month: 'short',
    day: 'numeric',
    timeZone: CHART_TIMEZONE,
  }).format(date);
}
