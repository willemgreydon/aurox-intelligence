import {
  type ProviderMarketHistoryPoint,
  type ProviderMarketObservation,
} from '@repo/providers';
import { getDashboardReadModel, type DashboardOperationalReadModel } from '@repo/db';
import { loadHistoryBars, loadQuoteSnapshots } from '../services/stock-simulation-service';

export type StockDetailReadModel = {
  symbol: string;
  provider: string;
  providerError: string | null;
  observation: ProviderMarketObservation | null;
  history: ProviderMarketHistoryPoint[];
  dashboard: DashboardOperationalReadModel;
};

export async function getStockDetailReadModel(symbol: string): Promise<StockDetailReadModel> {
  const dashboard = await getDashboardReadModel();

  const [snapshotResult, historyResult] = await Promise.allSettled([
    loadQuoteSnapshots([symbol]),
    loadHistoryBars(symbol),
  ]);
  const latestQuote = snapshotResult.status === 'fulfilled' ? snapshotResult.value[0] ?? null : null;
  const observation =
    latestQuote?.price !== null && latestQuote
      ? ({
          symbol,
          assetKind: 'stock',
          price: latestQuote.price,
          timestamp: latestQuote.observedAt ?? latestQuote.fetchedAt,
          source: latestQuote.source as ProviderMarketObservation['source'],
          currency: 'USD',
          ...(typeof latestQuote.change === 'number' ? { change: latestQuote.change } : {}),
          ...(typeof latestQuote.changePercent === 'number' ? { changePercent: latestQuote.changePercent } : {}),
        } satisfies ProviderMarketObservation)
      : null;
  const history =
    historyResult.status === 'fulfilled'
      ? historyResult.value.map((item) => ({
          symbol,
          assetKind: 'stock' as const,
          timestamp: item.timestamp,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume ?? undefined,
          source: item.source as ProviderMarketHistoryPoint['source'],
        }))
      : [];

  return {
    symbol,
    provider: observation?.source ?? history[0]?.source ?? 'cache',
    providerError:
      snapshotResult.status === 'rejected'
        ? snapshotResult.reason instanceof Error
          ? snapshotResult.reason.message
          : 'Unable to fetch stock detail snapshot.'
        : historyResult.status === 'rejected'
          ? historyResult.reason instanceof Error
            ? historyResult.reason.message
            : 'Unable to fetch stock history.'
          : null,
    observation,
    history,
    dashboard,
  };
}
