import type { Locale } from '@repo/api-contracts';
import { formatRelativeTimeLabel } from '../../lib/formatters';
import { getFreshnessLabel, getFreshnessState } from './market-data';

type AssetClassHint = 'stock' | 'etf' | 'crypto' | 'fx' | 'index' | null | undefined;

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

  // USD prices are always presented in en-US convention ($ leading, period
  // decimal) regardless of UI locale — a locale-formatted USD value (e.g. de-DE
  // "336,13 $") trails the symbol and reads as wrong for a USD amount. Other
  // localized text still follows the request locale; only the money glyph is fixed.
  void locale;
  return new Intl.NumberFormat('en-US', {
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
  assetClass?: AssetClassHint,
): string {
  const state = getFreshnessState(timestamp, assetClass);

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
