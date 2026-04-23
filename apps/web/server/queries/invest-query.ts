import { getLinkedInvestmentAccounts, listCatalogAssets, type CatalogAsset } from '@repo/db';
import { getSparkasseGeorgeConnectionCapability, type ProviderMarketObservation } from '@repo/providers';
import type { ConnectedInvestmentAccount } from '@repo/api-contracts';
import { loadQuoteSnapshots } from '../services/stock-simulation-service';

export type InvestReadModel = {
  provider: string;
  providerError: string | null;
  assets: CatalogAsset[];
  observations: ProviderMarketObservation[];
  linkedAccounts: ConnectedInvestmentAccount[];
  bankConnections: ReturnType<typeof getSparkasseGeorgeConnectionCapability>[];
};

export async function getInvestReadModel(): Promise<InvestReadModel> {
  const [assets, linkedAccounts] = await Promise.all([listCatalogAssets(), getLinkedInvestmentAccounts()]);
  const bankConnections = [getSparkasseGeorgeConnectionCapability()];

  try {
    const quotes = await loadQuoteSnapshots(assets.map((item) => item.symbol));
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
      linkedAccounts,
      bankConnections,
    };
  } catch (error) {
    return {
      provider: 'cache',
      providerError: error instanceof Error ? error.message : 'Unable to fetch investment quote context.',
      assets,
      observations: [],
      linkedAccounts,
      bankConnections,
    };
  }
}
