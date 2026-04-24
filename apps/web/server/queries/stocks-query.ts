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

export type StocksReadModelOptions = {
  symbolLimit?: number;
};

export async function getStocksReadModel(options: StocksReadModelOptions = {}): Promise<StocksReadModel> {
  const dev = process.env.NODE_ENV === 'development';
  const t0 = dev ? performance.now() : 0;
  const [dashboard, investmentUniverse] = await Promise.all([getDashboardReadModel(), getInvestmentUniverse()]);
  const allStockMetadata = investmentUniverse.filter((item) => item.assetClass === 'stock' || item.assetClass === 'etf');
  const symbolLimit =
    typeof options.symbolLimit === 'number' && Number.isFinite(options.symbolLimit) && options.symbolLimit > 0
      ? Math.floor(options.symbolLimit)
      : null;
  const stockMetadata =
    symbolLimit === null ? allStockMetadata : allStockMetadata.slice(0, symbolLimit);
  if (dev) {
    console.debug(
      `[stocks-query] dashboard+universe (${stockMetadata.length}${symbolLimit !== null ? `/${allStockMetadata.length}` : ''}): ${(performance.now() - t0).toFixed(0)}ms`,
    );
  }

  try {
    const t1 = dev ? performance.now() : 0;
    const observations = await loadQuoteSnapshots(stockMetadata.map((item) => item.symbol));
    if (dev) {
      console.debug(`[stocks-query] quote-snapshots (${stockMetadata.length}): ${(performance.now() - t1).toFixed(0)}ms`);
      console.debug(`[stocks-query] total: ${(performance.now() - t0).toFixed(0)}ms`);
    }

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
