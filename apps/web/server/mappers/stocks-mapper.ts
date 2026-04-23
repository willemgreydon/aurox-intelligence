import type { Locale, StockDetailPreview, StocksOverview } from '@repo/api-contracts';
import { deriveMarketInsight } from '@repo/ai-market-intelligence';
import { formatShortDateLabel } from '../../lib/formatters';
import { getMessages, type AppMessages } from '../../lib/i18n/messages';
import type { StockDetailReadModel } from '../queries/stock-detail-query';
import type { StocksReadModel } from '../queries/stocks-query';
import { mapOptionalTimestamp, mapRouteStatusLabel, mapRouteStatusTone, type RouteStatus } from './route-presentation';
import { getFreshnessState, getLatestTimestamp, groupAverageMove } from '../lib/market-data';
import { formatFreshnessLabel, toFiniteNumber } from '../lib/quote-display';

export type StocksOverviewViewModel = Omit<StocksOverview, 'metrics' | 'trackedStocks' | 'topMovers'> & {
  statusLabel: string;
  statusTone: ReturnType<typeof mapRouteStatusTone>;
  lastUpdatedLabel: string;
  freshnessLabel: string;
  metrics: Array<
    StocksOverview['metrics'][number] & {
      statusLabel: string;
      statusTone: ReturnType<typeof mapRouteStatusTone>;
    }
  >;
  trackedStocks: Array<
    StocksOverview['trackedStocks'][number] & {
      priceLabel: string;
      changeLabel: string;
      freshnessLabel: string;
    }
  >;
  topMovers: Array<
    StocksOverview['topMovers'][number] & {
      priceLabel: string;
      changeLabel: string;
      freshnessLabel: string;
    }
  >;
};

export type StockDetailViewModel = StockDetailPreview & {
  statusLabel: string;
  statusTone: ReturnType<typeof mapRouteStatusTone>;
  lastUpdatedLabel: string;
  priceLabel: string;
  changeLabel: string;
  historyStatusLabel: string;
  historyStatusTone: ReturnType<typeof mapRouteStatusTone>;
  historyRangeLabel: string;
  historyHighLabel: string;
  historyLowLabel: string;
};

function formatPrice(value: number | null, unavailableLabel: string): string {
  const normalized = toFiniteNumber(value);
  return normalized === null ? unavailableLabel : `$${normalized.toFixed(2)}`;
}

function formatChangePercent(value: number | null, partialLabel: string): string {
  const normalized = toFiniteNumber(value);

  if (normalized === null) {
    return partialLabel;
  }

  return `${normalized > 0 ? '+' : ''}${normalized.toFixed(2)}%`;
}

function deriveStatus(readModel: StocksReadModel): RouteStatus {
  if (readModel.providerError) {
    return 'attention';
  }

  if (!readModel.dashboard.dataSource.configured) {
    return 'attention';
  }

  return readModel.observations.length > 0 ? 'nominal' : 'attention';
}

export function mapStocksOverview(
  readModel: StocksReadModel,
  locale: Locale = 'en',
  messages: AppMessages = getMessages(locale),
): StocksOverview {
  const lastUpdated = getLatestTimestamp(readModel.observations) ?? readModel.dashboard.latestObservationAt;
  const sortedByChange = [...readModel.observations].sort((left, right) => (right.changePercent ?? -Infinity) - (left.changePercent ?? -Infinity));
  const trackedStocks = readModel.stockMetadata.map((metadata) => {
    const observation = readModel.observations.find((item) => item.symbol === metadata.symbol);
    const forecast = readModel.dashboard.forecasts.find((forecastItem) => forecastItem.symbol === metadata.symbol);
    return {
      symbol: metadata.symbol,
      name: metadata.name,
      price: observation?.price ?? null,
      change: observation?.change ?? null,
      changePercent: observation?.changePercent ?? null,
      freshness: observation?.timestamp ?? null,
      source: observation?.source ?? readModel.provider,
      forecastBias: forecast?.directionalBias ?? null,
    };
  });
  const advancers = trackedStocks.filter((item) => (item.changePercent ?? 0) > 0.05).length;
  const decliners = trackedStocks.filter((item) => (item.changePercent ?? 0) < -0.05).length;
  const unchanged = Math.max(0, trackedStocks.length - advancers - decliners);
  const sectorViews = readModel.stockMetadata
    .filter((item) => item.sector)
    .reduce<Array<{ label: string; value: number | null; symbols: string[] }>>((accumulator, item) => {
      const existing = accumulator.find((entry) => entry.label === item.sector);
      const observation = readModel.observations.find((entry) => entry.symbol === item.symbol);
      if (existing) {
        existing.symbols.push(item.symbol);
        if (typeof observation?.changePercent === 'number') {
          existing.value = ((existing.value ?? 0) * (existing.symbols.length - 1) + observation.changePercent) / existing.symbols.length;
        }
      } else {
        accumulator.push({
          label: item.sector ?? 'Unclassified',
          value: observation?.changePercent ?? null,
          symbols: [item.symbol],
        });
      }
      return accumulator;
    }, []);
  const liveFocusStock = trackedStocks.find((item) => item.price !== null) ?? null;
  const latestInsight =
    liveFocusStock
      ? deriveMarketInsight({
          assetId: `stock-${liveFocusStock.symbol.toLowerCase()}`,
          symbol: liveFocusStock.symbol,
          price: liveFocusStock.price,
          changePercent: liveFocusStock.changePercent,
          forecastBias: liveFocusStock.forecastBias,
          freshnessState: getFreshnessState(liveFocusStock.freshness),
          sourceSummary: readModel.providerError ? 'partial provider coverage' : `${readModel.provider.toUpperCase()} quote context`,
        })
      : null;
  const freshnessState = getFreshnessState(lastUpdated);

  return {
    title: 'Stocks Workstation',
    description: 'Equity monitoring surface for tracked symbols, live quotes, forecast overlap, and detail-ready instrument analysis.',
    status: deriveStatus(readModel),
    freshnessState,
    lastUpdated,
    freshnessSummary: readModel.providerError
      ? messages.stocks.providerUnavailableSummary.replace('{{message}}', readModel.providerError)
      : trackedStocks.length > 0
        ? messages.stocks.trackingSummary
            .replace('{{count}}', String(trackedStocks.length))
            .replace('{{provider}}', readModel.provider)
        : messages.stocks.noObservationsSummary,
    sourceSummary: readModel.providerError
      ? 'Provider snapshot unavailable, so the page is rendering partial workstation state.'
      : `Quotes are being sourced from ${readModel.provider.toUpperCase()} and joined with persisted forecast previews where they overlap.`,
    metrics: [
      {
        id: 'tracked',
        label: 'Tracked symbols',
        value: String(readModel.stockMetadata.length),
        detail: 'Live stock quotes currently returned by the market provider.',
        status: readModel.stockMetadata.length > 0 ? 'nominal' : 'attention',
      },
      {
        id: 'forecast-overlap',
        label: 'Forecast overlap',
        value: String(trackedStocks.filter((item) => item.forecastBias !== null).length),
        detail: 'Tracked stocks that already have persisted forecast previews.',
        status: readModel.dashboard.forecasts.length > 0 ? 'nominal' : 'attention',
      },
      {
        id: 'freshness',
        label: 'Quote freshness',
        value: mapOptionalTimestamp(lastUpdated, locale, messages).relative,
        detail: 'Latest observed timestamp across the returned stock quote set.',
        status: lastUpdated ? 'nominal' : 'attention',
      },
      {
        id: 'provider',
        label: 'Provider state',
        value: readModel.provider.toUpperCase(),
        detail: readModel.providerError ?? 'Live quote provider is reachable for the current stock set.',
        status: readModel.providerError ? 'degraded' : 'nominal',
      },
    ],
    marketSnapshot: {
      advancers,
      decliners,
      unchanged,
      averageMovePercent: groupAverageMove(readModel.observations),
      strongestSymbol: sortedByChange[0]?.symbol ?? null,
      weakestSymbol: [...sortedByChange].reverse()[0]?.symbol ?? null,
    },
    trackedStocks,
    topMovers: sortedByChange.slice(0, 6).map((item) => {
      const forecast = readModel.dashboard.forecasts.find((forecastItem) => forecastItem.symbol === item.symbol);
      const metadata = readModel.stockMetadata.find((stockItem) => stockItem.symbol === item.symbol);
      return {
        symbol: item.symbol,
        name: metadata?.name ?? item.symbol,
        price: item.price,
        change: item.change ?? null,
        changePercent: item.changePercent ?? null,
        freshness: item.timestamp,
        source: item.source,
        forecastBias: forecast?.directionalBias ?? null,
      };
    }),
    sectorViews,
    forecastPreview: readModel.dashboard.forecasts.slice(0, 4).map((forecast) => ({
      symbol: forecast.symbol,
      directionalBias: forecast.directionalBias,
      confidence: forecast.confidenceScore,
      summary: forecast.scenarioSummary,
    })),
    latestInsight,
    insights: [
      readModel.stockMetadata.length > 0
        ? `${readModel.stockMetadata.length} tracked symbols are curated in the product universe, with live quotes filling in whenever providers respond.`
        : 'The Stocks surface is detail-ready, but no tracked symbols are currently configured.',
      readModel.dashboard.forecasts.length > 0
        ? 'Forecast overlays are being joined from persisted dashboard forecast previews where symbols overlap.'
        : 'Forecast overlays remain partial until more persisted stock forecast rows are available.',
      'Detail routes are ready to host richer chart, signal, and risk views per symbol.',
    ],
    emptyStateMessage: readModel.stockMetadata.length > 0 ? null : 'No tracked symbols are available from the configured provider right now.',
  };
}

export function mapStocksOverviewViewModel(
  snapshot: StocksOverview,
  locale: Locale = 'en',
  messages: AppMessages = getMessages(locale),
): StocksOverviewViewModel {
  const timestamp = mapOptionalTimestamp(snapshot.lastUpdated, locale, messages);

  return {
    ...snapshot,
    statusLabel: mapRouteStatusLabel(snapshot.status, messages.status),
    statusTone: mapRouteStatusTone(snapshot.status),
    lastUpdatedLabel: timestamp.absolute,
    freshnessLabel: timestamp.relative,
    metrics: snapshot.metrics.map((metric) => ({
      ...metric,
      statusLabel: mapRouteStatusLabel(metric.status, messages.status),
      statusTone: mapRouteStatusTone(metric.status),
    })),
    trackedStocks: snapshot.trackedStocks.map((item) => ({
      ...item,
      priceLabel: formatPrice(item.price, messages.common.unavailable),
      changeLabel: formatChangePercent(item.changePercent, messages.common.partial),
      freshnessLabel: formatFreshnessLabel(item.freshness, locale, messages.common.unavailable),
    })),
    topMovers: snapshot.topMovers.map((item) => ({
      ...item,
      priceLabel: formatPrice(item.price, messages.common.unavailable),
      changeLabel: formatChangePercent(item.changePercent, messages.common.partial),
      freshnessLabel: formatFreshnessLabel(item.freshness, locale, messages.common.unavailable),
    })),
  } satisfies StocksOverviewViewModel;
}

export function mapStockDetail(
  readModel: StockDetailReadModel,
  locale: Locale = 'en',
  messages: AppMessages = getMessages(locale),
): StockDetailPreview {
  const matchedForecast = readModel.dashboard.forecasts.find((item) => item.symbol === readModel.symbol);
  const sortedHistory = [...readModel.history].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
  const history = sortedHistory.map((point) => ({
    label: formatShortDateLabel(point.timestamp, locale, messages.common.unavailable),
    timestamp: point.timestamp,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume ?? null,
  }));
  const historyStatus: RouteStatus = history.length > 1 ? 'nominal' : readModel.providerError ? 'attention' : 'attention';
  const firstHistory = history[0];
  const lastHistory = history.at(-1);

  return {
    symbol: readModel.symbol,
    title: `${readModel.symbol} Instrument Workspace`,
    description: 'Detail-ready equity workspace for price context, forecast overlays, signal breakdowns, and risk framing.',
    status: readModel.observation ? 'nominal' : readModel.providerError ? 'attention' : 'attention',
    lastUpdated: readModel.observation?.timestamp ?? matchedForecast?.producedAt ?? null,
    price: readModel.observation?.price ?? null,
    changePercent: readModel.observation?.changePercent ?? null,
    source: readModel.observation?.source ?? null,
    historyStatus,
    historySummary: history.length > 1
      ? `Rendering ${history.length} daily bars for ${readModel.symbol} from the current market provider path.`
      : readModel.providerError ?? 'Historical stock data is not currently available for this symbol.',
    historyWindowLabel: firstHistory && lastHistory
      ? `${firstHistory.label} ${messages.stocks.historyRangeSeparator} ${lastHistory.label}`
      : messages.common.unavailable,
    history,
    historyEmptyMessage: history.length > 1 ? null : messages.stocks.historyUnavailable,
    notes: [
      readModel.observation
        ? `Live quote data is available from ${readModel.observation.source}.`
        : readModel.providerError ?? 'Live quote data is not currently available for this symbol.',
      matchedForecast
        ? `Forecast preview is available for the ${matchedForecast.horizon} horizon with ${matchedForecast.directionalBias} bias.`
        : 'No persisted forecast preview currently matches this symbol.',
      'This route is prepared for deeper chart, fundamentals, news, and scenario sections as those read models arrive.',
    ],
  };
}

export function mapStockDetailViewModel(
  snapshot: StockDetailPreview,
  locale: Locale = 'en',
  messages: AppMessages = getMessages(locale),
): StockDetailViewModel {
  const highs = snapshot.history.map((point) => point.high);
  const lows = snapshot.history.map((point) => point.low);
  const historyHigh = highs.length > 0 ? Math.max(...highs) : null;
  const historyLow = lows.length > 0 ? Math.min(...lows) : null;

  return {
    ...snapshot,
    statusLabel: mapRouteStatusLabel(snapshot.status, messages.status),
    statusTone: mapRouteStatusTone(snapshot.status),
    lastUpdatedLabel: mapOptionalTimestamp(snapshot.lastUpdated, locale, messages).absolute,
    priceLabel: formatPrice(snapshot.price, messages.common.unavailable),
    changeLabel: formatChangePercent(snapshot.changePercent, messages.common.partial),
    historyStatusLabel: mapRouteStatusLabel(snapshot.historyStatus, messages.status),
    historyStatusTone: mapRouteStatusTone(snapshot.historyStatus),
    historyRangeLabel: snapshot.historyWindowLabel,
    historyHighLabel: formatPrice(historyHigh, messages.common.unavailable),
    historyLowLabel: formatPrice(historyLow, messages.common.unavailable),
  } satisfies StockDetailViewModel;
}
