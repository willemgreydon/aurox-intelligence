import type { Locale } from '@repo/api-contracts';
import { formatRelativeTimeLabel } from '../../lib/formatters';
import { getFreshnessLabel, getFreshnessState } from './market-data';

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

export function toFiniteNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number') {
    return null;
  }

  return Number.isFinite(value) ? value : null;
}

export function formatUsdPrice(
  value: number | null | undefined,
  locale: Locale,
  unavailableLabel = 'Unavailable',
): string {
  const normalized = toFiniteNumber(value);

  if (normalized === null) {
    return unavailableLabel;
  }

  return new Intl.NumberFormat(toLocaleTag(locale), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(normalized);
}

export function formatPercentChange(
  value: number | null | undefined,
  partialLabel = 'Partial',
): string {
  const normalized = toFiniteNumber(value);

  if (normalized === null) {
    return partialLabel;
  }

  return `${normalized > 0 ? '+' : ''}${normalized.toFixed(2)}%`;
}

export function getQuoteTimestamp(quote: { observedAt?: string | null; fetchedAt?: string | null } | null | undefined): string | null {
  if (!quote) {
    return null;
  }

  return quote.observedAt ?? quote.fetchedAt ?? null;
}

export function formatFreshnessLabel(
  timestamp: string | null | undefined,
  locale: Locale,
  unavailableLabel = 'Unavailable',
): string {
  const state = getFreshnessState(timestamp);

  if (state === 'unavailable') {
    return unavailableLabel;
  }

  const stateLabel = getFreshnessLabel(state);
  const relativeLabel = formatRelativeTimeLabel(timestamp ?? null, locale, unavailableLabel);

  if (relativeLabel === unavailableLabel) {
    return stateLabel;
  }

  return `${stateLabel} | ${relativeLabel}`;
}
