import { getInvestmentUniverse } from '@repo/db';
import { deriveSignalSnapshot } from '@repo/signals';
import { loadHistoryBars, loadQuoteSnapshots } from './stock-simulation-service';

type MarketGraphDataOptions = {
  assetClass?: 'stock' | 'etf' | 'crypto';
  preferredSymbols?: string[];
  limit?: number;
};

export async function getMarketGraphData(options: MarketGraphDataOptions = {}) {
  const assets = await getInvestmentUniverse();
  const filteredAssets = options.assetClass
    ? assets.filter((asset) => asset.assetClass === options.assetClass)
    : assets;
  const preferredSymbols = options.preferredSymbols ?? [];
  const bySymbol = new Map(filteredAssets.map((asset) => [asset.symbol, asset]));
  const prioritizedAssets = preferredSymbols
    .map((symbol) => bySymbol.get(symbol))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
  const remainingAssets = filteredAssets.filter((asset) => !preferredSymbols.includes(asset.symbol));
  const selectedAssets = [...prioritizedAssets, ...remainingAssets].slice(0, options.limit ?? 36);

  const [snapshots, histories] = await Promise.all([
    loadQuoteSnapshots(selectedAssets.map((asset) => asset.symbol)).catch(() => []),
    Promise.all(
      selectedAssets.map(async (asset) => {
        const history = await loadHistoryBars(asset.symbol).catch(() => []);
        const closes = history.map((point) => point.close);
        return {
          assetId: asset.assetId,
          symbol: asset.symbol,
          name: asset.name,
          assetClass: asset.assetClass,
          history,
          signal: closes.length > 1 ? deriveSignalSnapshot(asset.assetId, closes) : null,
        };
      }),
    ),
  ]);

  return {
    provider: snapshots[0]?.source ?? 'cache',
    assets: histories.map((asset) => ({
      ...asset,
      snapshot: (() => {
        const snapshot = snapshots.find((item) => item.symbol === asset.symbol);

        if (!snapshot || typeof snapshot.price !== 'number') {
          return null;
        }

        if (typeof snapshot.changePercent === 'number') {
          return {
            price: snapshot.price,
            changePercent: snapshot.changePercent,
          };
        }

        return {
          price: snapshot.price,
        };
      })(),
    })),
  };
}
