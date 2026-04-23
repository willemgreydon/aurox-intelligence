import { getCatalogAssetBySymbol } from '../repositories/asset-repository';
import { getMarketHistoryBars, getLatestMarketQuoteSnapshot } from '../repositories/market-data-repository';

export type AssetDetailReadModel = {
  asset: Awaited<ReturnType<typeof getCatalogAssetBySymbol>>;
  quote: Awaited<ReturnType<typeof getLatestMarketQuoteSnapshot>>;
  history: Awaited<ReturnType<typeof getMarketHistoryBars>>;
};

export async function getAssetDetail(symbol: string): Promise<AssetDetailReadModel | null> {
  const asset = await getCatalogAssetBySymbol(symbol);

  if (!asset) {
    return null;
  }

  const [quote, history] = await Promise.all([
    getLatestMarketQuoteSnapshot(asset.symbol),
    getMarketHistoryBars(asset.symbol),
  ]);

  return {
    asset,
    quote,
    history,
  };
}
