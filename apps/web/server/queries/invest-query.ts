import { getLinkedInvestmentAccounts, listCatalogAssets, type CatalogAsset } from '@repo/db';
import { getSparkasseGeorgeConnectionCapability, type ProviderMarketObservation } from '@repo/providers';
import type { ConnectedInvestmentAccount } from '@repo/api-contracts';
import { loadMiniHistorySeries, loadQuoteSnapshots } from '../services/stock-simulation-service';

export type InvestReadModel = {
  provider: string;
  providerError: string | null;
  assets: CatalogAsset[];
  observations: ProviderMarketObservation[];
  historySeriesBySymbol: Record<string, number[]>;
  linkedAccounts: ConnectedInvestmentAccount[];
  bankConnections: ReturnType<typeof getSparkasseGeorgeConnectionCapability>[];
};

export async function getInvestReadModel(): Promise<InvestReadModel> {
  const [assets, linkedAccounts] = await Promise.all([listCatalogAssets(), getLinkedInvestmentAccounts()]);
  const bankConnections = [getSparkasseGeorgeConnectionCapability()];
  // Pre-build the asset ID map so loadQuoteSnapshots can skip its own catalog fetch on stale paths.
  const assetIdBySymbol: ReadonlyMap<string, string> = new Map(assets.map((asset) => [asset.symbol, asset.assetId]));

  try {
    const symbols = assets.map((item) => item.symbol);
    const [quotes, historySeriesBySymbol] = await Promise.all([
      loadQuoteSnapshots(symbols, assetIdBySymbol),
      loadMiniHistorySeries(symbols, 60).catch(() => ({})),
    ]);
    const quoteBySymbol = new Map(quotes.map((item) => [item.symbol, item]));

    const observations = assets.flatMap((asset) => {
      const item = quoteBySymbol.get(asset.symbol);
      return typeof item?.price === 'number'
        ? [{
            symbol: item.symbol,
            assetKind: asset.assetClass,
            price: item.price,
            timestamp: item.observedAt ?? item.fetchedAt,
            source: item.source as ProviderMarketObservation['source'],
            currency: 'USD' as const,
            ...(typeof item.change === 'number' ? { change: item.change } : {}),
            ...(typeof item.changePercent === 'number' ? { changePercent: item.changePercent } : {}),
          }]
        : [];
    });

    return {
      provider: observations[0]?.source ?? 'cache',
      providerError: null,
      assets,
      observations,
      historySeriesBySymbol,
      linkedAccounts,
      bankConnections,
    };
  } catch (error) {
    return {
      provider: 'cache',
      providerError: error instanceof Error ? error.message : 'Unable to fetch investment quote context.',
      assets,
      observations: [],
      historySeriesBySymbol: {},
      linkedAccounts,
      bankConnections,
    };
  }
}
