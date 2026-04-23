import type { FxDetailPreview, FxOverview } from '@repo/api-contracts';
import { formatShortDateLabel } from '../../lib/formatters';
import type { FxDetailReadModel } from '../queries/fx-detail-query';
import type { FxReadModel } from '../queries/fx-query';
import { mapOptionalTimestamp, mapRouteStatusLabel, mapRouteStatusTone, type RouteStatus } from './route-presentation';

export type FxOverviewViewModel = Omit<FxOverview, 'metrics' | 'trackedPairs' | 'strongestPairs'> & {
  statusLabel: string;
  statusTone: ReturnType<typeof mapRouteStatusTone>;
  lastUpdatedLabel: string;
  freshnessLabel: string;
  metrics: Array<
    FxOverview['metrics'][number] & {
      statusLabel: string;
      statusTone: ReturnType<typeof mapRouteStatusTone>;
    }
  >;
  trackedPairs: Array<
    FxOverview['trackedPairs'][number] & {
      priceLabel: string;
      changeLabel: string;
      freshnessLabel: string;
    }
  >;
  strongestPairs: Array<
    FxOverview['strongestPairs'][number] & {
      priceLabel: string;
      changeLabel: string;
      freshnessLabel: string;
    }
  >;
};

export type FxDetailViewModel = FxDetailPreview & {
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

function formatQuote(value: number | null): string {
  return value === null ? 'Unavailable' : value.toFixed(4);
}

function formatChangePercent(value: number | null): string {
  if (value === null) {
    return 'Unavailable';
  }

  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function toPairDisplay(symbol: string): string {
  const normalized = symbol.replace('.FOREX', '').replace('OANDA:', '').replace('_', '');
  return normalized.length === 6 ? `${normalized.slice(0, 3)}/${normalized.slice(3)}` : symbol;
}

function deriveFxStatus(readModel: FxReadModel): RouteStatus {
  if (readModel.providerError) {
    return 'attention';
  }

  return readModel.pairs.length > 0 ? 'nominal' : 'attention';
}

export function mapFxOverview(readModel: FxReadModel): FxOverview {
  const lastUpdated = readModel.pairs.map((item) => item.timestamp).sort().at(-1) ?? null;
  const trackedPairs = readModel.pairs.map((item) => ({
    pair: toPairDisplay(item.symbol),
    displayName: `${toPairDisplay(item.symbol)} monitored pair`,
    price: item.price,
    changePercent: item.changePercent ?? null,
    freshness: item.timestamp,
    source: item.source,
    directionalBias: readModel.dashboard.forecasts.find((forecast) => forecast.symbol === toPairDisplay(item.symbol).replace('/', ''))?.directionalBias ?? null,
  }));
  const strongestPairs = [...trackedPairs].sort((left, right) => (right.changePercent ?? -Infinity) - (left.changePercent ?? -Infinity)).slice(0, 4);

  return {
    title: 'FX Workstation',
    description: 'Pair-focused surface for monitored FX quotes, freshness, directional context, and detail-ready cross-rate analysis.',
    status: deriveFxStatus(readModel),
    lastUpdated,
    freshnessSummary: readModel.providerError
      ? `FX pair snapshots are unavailable: ${readModel.providerError}`
      : trackedPairs.length > 0
        ? `Tracking ${trackedPairs.length} FX pairs from ${readModel.provider}.`
        : 'No FX pair observations are currently available from the configured provider path.',
    metrics: [
      {
        id: 'tracked-pairs',
        label: 'Tracked pairs',
        value: String(trackedPairs.length),
        detail: 'FX pairs currently returned from the provider boundary.',
        status: trackedPairs.length > 0 ? 'nominal' : 'attention',
      },
      {
        id: 'freshness',
        label: 'Quote freshness',
        value: mapOptionalTimestamp(lastUpdated).relative,
        detail: 'Latest observed FX quote timestamp.',
        status: lastUpdated ? 'nominal' : 'attention',
      },
      {
        id: 'provider',
        label: 'Provider state',
        value: readModel.provider.toUpperCase(),
        detail: readModel.providerError ?? 'FX provider route is responding for the requested pairs.',
        status: readModel.providerError ? 'degraded' : 'nominal',
      },
      {
        id: 'forecast-overlap',
        label: 'Forecast overlap',
        value: String(readModel.dashboard.forecasts.filter((item) => item.assetClass === 'fx').length),
        detail: 'Persisted FX forecast previews available for dashboard overlap.',
        status: readModel.dashboard.forecasts.some((item) => item.assetClass === 'fx') ? 'nominal' : 'attention',
      },
    ],
    trackedPairs,
    strongestPairs,
    insights: [
      trackedPairs.length > 0
        ? 'The FX surface is already capable of rendering live pair snapshots through the provider boundary.'
        : 'The FX surface is structurally ready, but live pair data is still partial or unavailable.',
      'Pair detail routes are prepared for signal, scenario, and macro context modules.',
      'Directional bias remains partial until more persisted FX forecast rows are available.',
    ],
    emptyStateMessage: trackedPairs.length > 0 ? null : 'No live FX pair observations are available for the current provider path.',
  };
}

export function mapFxOverviewViewModel(snapshot: FxOverview): FxOverviewViewModel {
  const timestamp = mapOptionalTimestamp(snapshot.lastUpdated);

  return {
    ...snapshot,
    statusLabel: mapRouteStatusLabel(snapshot.status),
    statusTone: mapRouteStatusTone(snapshot.status),
    lastUpdatedLabel: timestamp.absolute,
    freshnessLabel: timestamp.relative,
    metrics: snapshot.metrics.map((metric) => ({
      ...metric,
      statusLabel: mapRouteStatusLabel(metric.status),
      statusTone: mapRouteStatusTone(metric.status),
    })),
    trackedPairs: snapshot.trackedPairs.map((item) => ({
      ...item,
      priceLabel: formatQuote(item.price),
      changeLabel: formatChangePercent(item.changePercent),
      freshnessLabel: mapOptionalTimestamp(item.freshness).relative,
    })),
    strongestPairs: snapshot.strongestPairs.map((item) => ({
      ...item,
      priceLabel: formatQuote(item.price),
      changeLabel: formatChangePercent(item.changePercent),
      freshnessLabel: mapOptionalTimestamp(item.freshness).relative,
    })),
  } satisfies FxOverviewViewModel;
}

export function mapFxDetail(readModel: FxDetailReadModel): FxDetailPreview {
  const sortedHistory = [...readModel.history].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
  const history = sortedHistory.map((point) => ({
    label: formatShortDateLabel(point.timestamp),
    timestamp: point.timestamp,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume ?? null,
  }));
  const firstHistory = history[0];
  const lastHistory = history.at(-1);
  const historyStatus: RouteStatus = history.length > 1 ? 'nominal' : 'attention';

  return {
    pair: readModel.pair,
    title: `${readModel.pair.toUpperCase()} Pair Workspace`,
    description: 'Detail-ready FX workspace for pair trend reading, macro context, signal overlays, and scenario framing.',
    status: readModel.observation ? 'nominal' : 'attention',
    lastUpdated: readModel.observation?.timestamp ?? null,
    price: readModel.observation?.price ?? null,
    changePercent: readModel.observation?.changePercent ?? null,
    source: readModel.observation?.source ?? null,
    historyStatus,
    historySummary: history.length > 1
      ? `Rendering ${history.length} daily bars for ${readModel.pair.toUpperCase()} from the FX provider path.`
      : readModel.providerError ?? 'Historical FX pair data is not currently available.',
    historyWindowLabel: firstHistory && lastHistory ? `${firstHistory.label} to ${lastHistory.label}` : 'Unavailable',
    history,
    historyEmptyMessage: history.length > 1 ? null : 'No historical FX pair bars are currently available.',
    notes: [
      readModel.observation
        ? `Live pair quote is available from ${readModel.observation.source}.`
        : readModel.providerError ?? 'Live pair quote is not currently available.',
      'This route is prepared for pair-specific charts, regime commentary, and macro drivers.',
      'FX forecast overlays remain partial until dedicated persisted pair forecast coverage expands.',
    ],
  };
}

export function mapFxDetailViewModel(snapshot: FxDetailPreview): FxDetailViewModel {
  const highs = snapshot.history.map((point) => point.high);
  const lows = snapshot.history.map((point) => point.low);
  const historyHigh = highs.length > 0 ? Math.max(...highs) : null;
  const historyLow = lows.length > 0 ? Math.min(...lows) : null;

  return {
    ...snapshot,
    statusLabel: mapRouteStatusLabel(snapshot.status),
    statusTone: mapRouteStatusTone(snapshot.status),
    lastUpdatedLabel: mapOptionalTimestamp(snapshot.lastUpdated).absolute,
    priceLabel: formatQuote(snapshot.price),
    changeLabel: formatChangePercent(snapshot.changePercent),
    historyStatusLabel: mapRouteStatusLabel(snapshot.historyStatus),
    historyStatusTone: mapRouteStatusTone(snapshot.historyStatus),
    historyRangeLabel: snapshot.historyWindowLabel,
    historyHighLabel: formatQuote(historyHigh),
    historyLowLabel: formatQuote(historyLow),
  } satisfies FxDetailViewModel;
}
