import {
  fetchMarketHistory,
  fetchMarketSnapshot,
  getProviderEnv,
  type ProviderMarketHistoryPoint,
  type ProviderMarketObservation,
} from '@repo/providers';
import { getDashboardReadModel, type DashboardOperationalReadModel } from '@repo/db';

function normalizePairToProviderSymbol(pair: string): { provider: 'finnhub' | 'eodhd'; symbol: string } {
  const env = getProviderEnv();
  const normalized = pair.toUpperCase().replace('/', '');

  if (env.EODHD_API_KEY) {
    return { provider: 'eodhd', symbol: `${normalized}.FOREX` };
  }

  if (normalized.length === 6) {
    return { provider: 'finnhub', symbol: `OANDA:${normalized.slice(0, 3)}_${normalized.slice(3)}` };
  }

  return { provider: 'finnhub', symbol: pair };
}

export type FxDetailReadModel = {
  pair: string;
  provider: string;
  providerError: string | null;
  observation: ProviderMarketObservation | null;
  history: ProviderMarketHistoryPoint[];
  dashboard: DashboardOperationalReadModel;
};

export async function getFxDetailReadModel(pair: string): Promise<FxDetailReadModel> {
  const resolved = normalizePairToProviderSymbol(pair);
  const dashboard = await getDashboardReadModel();

  const [snapshotResult, historyResult] = await Promise.allSettled([
    fetchMarketSnapshot({
      provider: resolved.provider,
      symbols: [resolved.symbol],
    }),
    fetchMarketHistory({
      provider: resolved.provider,
      symbol: resolved.symbol,
    }),
  ]);
  const observation = snapshotResult.status === 'fulfilled' ? snapshotResult.value[0] ?? null : null;
  const history = historyResult.status === 'fulfilled' ? historyResult.value : [];

  return {
    pair,
    provider: resolved.provider,
    providerError:
      snapshotResult.status === 'rejected'
        ? snapshotResult.reason instanceof Error
          ? snapshotResult.reason.message
          : 'Unable to fetch FX detail snapshot.'
        : historyResult.status === 'rejected'
          ? historyResult.reason instanceof Error
            ? historyResult.reason.message
            : 'Unable to fetch FX history.'
          : null,
    observation,
    history,
    dashboard,
  };
}
