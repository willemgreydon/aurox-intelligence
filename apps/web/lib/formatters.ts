import type { Locale } from '@repo/api-contracts';

function trimFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.0$/, '');
}

/**
 * Deterministic compact USD formatter safe for SSR + client hydration.
 * Does NOT use Intl compact notation — avoids ICU version mismatches between
 * Node and browser that produce "$9.0K" vs "$9K" hydration errors.
 */
export function formatCompactUsd(value: number | null | undefined): string {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}$${trimFixed(abs / 1_000_000_000, 1)}B`;
  }

  if (abs >= 1_000_000) {
    return `${sign}$${trimFixed(abs / 1_000_000, 1)}M`;
  }

  if (abs >= 1_000) {
    return `${sign}$${trimFixed(abs / 1_000, 1)}K`;
  }

  return `${sign}$${trimFixed(abs, 0)}`;
}

function toLocaleTag(locale: Locale): string {
  switch (locale) {
    case 'de':
      return 'de-DE';
    case 'fr':
      return 'fr-FR';
    case 'es':
      return 'es-ES';
    case 'it':
      return 'it-IT';
    case 'pt':
      return 'pt-PT';
    case 'nl':
      return 'nl-NL';
    case 'zh':
      return 'zh-CN';
    case 'ja':
      return 'ja-JP';
    case 'ko':
      return 'ko-KR';
    case 'ar':
      return 'ar-SA';
    case 'hi':
      return 'hi-IN';
    default:
      return 'en-US';
  }
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function toValidDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTimeLabel(
  value: string,
  locale: Locale = 'en',
  unavailableLabel = 'Unavailable',
): string {
  const parsed = toValidDate(value);

  if (!parsed) {
    return unavailableLabel;
  }

  return new Intl.DateTimeFormat(toLocaleTag(locale), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(parsed);
}

export function formatShortDateLabel(
  value: string,
  locale: Locale = 'en',
  unavailableLabel = 'Unavailable',
): string {
  const parsed = toValidDate(value);

  if (!parsed) {
    return unavailableLabel;
  }

  return new Intl.DateTimeFormat(toLocaleTag(locale), {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function formatOptionalDateTimeLabel(
  value: string | null,
  locale: Locale = 'en',
  unavailableLabel = 'Unavailable',
): string {
  if (!value) {
    return unavailableLabel;
  }

  return formatDateTimeLabel(value, locale, unavailableLabel);
}

export function formatRelativeTimeLabel(
  value: string | null,
  locale: Locale = 'en',
  unavailableLabel = 'Unavailable',
  now = new Date(),
): string {
  if (!value) {
    return unavailableLabel;
  }

  const parsed = toValidDate(value);

  if (!parsed) {
    return unavailableLabel;
  }

  const differenceMs = now.getTime() - parsed.getTime();
  const minutes = Math.max(0, Math.round(differenceMs / 60000));
  const formatter = new Intl.RelativeTimeFormat(toLocaleTag(locale), {
    numeric: 'auto',
    style: 'short',
  });

  if (minutes < 1) {
    return formatter.format(0, 'minute');
  }

  if (minutes < 60) {
    return formatter.format(-minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return formatter.format(-hours, 'hour');
  }

  const days = Math.round(hours / 24);
  return formatter.format(-days, 'day');
}
