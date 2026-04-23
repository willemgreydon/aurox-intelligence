import type { Locale, MarketTicker } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';
import type { MarketTickerReadModel } from '../queries/market-ticker-query';
import { mapOptionalTimestamp, mapRouteStatusLabel, mapRouteStatusTone } from './route-presentation';
import { formatSignedPercent, getFreshnessState, getLatestTimestamp, getTrendDirection } from '../lib/market-data';
import { formatFreshnessLabel, toFiniteNumber } from '../lib/quote-display';

export type MarketTickerViewModel = MarketTicker & {
  statusLabel: string;
  statusTone: ReturnType<typeof mapRouteStatusTone>;
  lastUpdatedLabel: string;
  items: Array<
    MarketTicker['items'][number] & {
      priceLabel: string;
      changeLabel: string;
      freshnessLabel: string;
    }
  >;
};

function formatPrice(value: number | null, unavailableLabel: string) {
  const normalized = toFiniteNumber(value);
  return normalized === null ? unavailableLabel : `$${normalized.toFixed(2)}`;
}

function formatChange(changePercent: number | null, partialLabel: string) {
  const normalized = toFiniteNumber(changePercent);

  if (normalized === null) {
    return partialLabel;
  }

  return formatSignedPercent(normalized);
}

export function mapMarketTicker(
  readModel: MarketTickerReadModel,
  messages: Pick<AppMessages, 'shell' | 'ticker'>,
): MarketTicker {
  const lastUpdatedAt = getLatestTimestamp(readModel.observations);
  const freshnessState = getFreshnessState(lastUpdatedAt);
  const providerLabel = readModel.provider.toUpperCase();

  return {
    title: messages.shell.marketPulse,
    status: readModel.providerError ? 'attention' : readModel.observations.length > 0 ? 'nominal' : 'attention',
    freshnessState,
    lastUpdatedAt,
    sourceSummary: readModel.providerError
      ? messages.ticker.errorSummary.replace('{{message}}', readModel.providerError)
      : messages.ticker.sourceSummary.replace('{{provider}}', providerLabel),
    items: readModel.universe.map((item) => {
      const observation = readModel.observations.find((entry) => entry.symbol === item.symbol);
      return {
        symbol: item.symbol,
        label: item.label,
        assetClass: item.assetClass,
        price: observation?.price ?? null,
        change: observation?.change ?? null,
        changePercent: observation?.changePercent ?? null,
        direction: getTrendDirection(observation?.changePercent ?? null),
        freshnessState: getFreshnessState(observation?.timestamp),
        lastUpdatedAt: observation?.timestamp ?? null,
        source: observation?.source ?? null,
      };
    }),
    emptyStateMessage: readModel.observations.length > 0 ? null : messages.ticker.emptyState,
  };
}

export function mapMarketTickerViewModel(
  snapshot: MarketTicker,
  locale: Locale,
  messages: Pick<AppMessages, 'common' | 'status'>,
): MarketTickerViewModel {
  return {
    ...snapshot,
    statusLabel: mapRouteStatusLabel(snapshot.status, messages.status),
    statusTone: mapRouteStatusTone(snapshot.status),
    lastUpdatedLabel: mapOptionalTimestamp(snapshot.lastUpdatedAt, locale, messages).relative,
    items: snapshot.items.map((item) => ({
      ...item,
      priceLabel: formatPrice(item.price, messages.common.unavailable),
      changeLabel: formatChange(item.changePercent, messages.common.partial),
      freshnessLabel: formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable),
    })),
  };
}
