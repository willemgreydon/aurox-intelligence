import type { ProviderMarketObservation } from '@repo/providers';
import { getDashboardReadModel, getInvestmentUniverse, type DashboardOperationalReadModel, type InvestmentUniverseAsset } from '@repo/db';
import { loadQuoteSnapshots } from '../services/stock-simulation-service';

export type StocksReadModel = {
  provider: string;
  providerError: string | null;
  observations: ProviderMarketObservation[];
  dashboard: DashboardOperationalReadModel;
  stockMetadata: InvestmentUniverseAsset[];
};

export async function getStocksReadModel(): Promise<StocksReadModel> {
  const [dashboard, investmentUniverse] = await Promise.all([getDashboardReadModel(), getInvestmentUniverse()]);
  const stockMetadata = investmentUniverse.filter((item) => item.assetClass === 'stock' || item.assetClass === 'etf');

  try {
    const observations = await loadQuoteSnapshots(stockMetadata.map((item) => item.symbol));

    return {
      provider: observations[0]?.source ?? 'cache',
      providerError: null,
      observations: observations.flatMap((item) =>
        typeof item.price === 'number'
          ? [{
              symbol: item.symbol,
              assetKind: item.symbol === 'SPY' || item.symbol === 'QQQ' ? 'etf' : 'stock',
              price: item.price,
              timestamp: item.observedAt ?? item.fetchedAt,
              source: item.source as ProviderMarketObservation['source'],
              currency: 'USD',
              ...(typeof item.change === 'number' ? { change: item.change } : {}),
              ...(typeof item.changePercent === 'number' ? { changePercent: item.changePercent } : {}),
            }]
          : [],
      ),
      dashboard,
      stockMetadata,
    };
  } catch (error) {
    return {
      provider: 'cache',
      providerError: error instanceof Error ? error.message : 'Unable to fetch stocks snapshot.',
      observations: [],
      dashboard,
      stockMetadata,
    };
  }
}
