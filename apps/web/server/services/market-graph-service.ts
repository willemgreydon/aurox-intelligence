import { getInvestmentUniverse, getMarketHistoryBarsBySymbols } from '@repo/db';
import type { PersistedMarketHistoryBar } from '@repo/db';
import { deriveSignalSnapshot } from '@repo/signals';
import { unstable_cache } from 'next/cache';
import { perfLog, perfNow } from '../lib/perf';
import { loadQuoteSnapshots } from './stock-simulation-service';

type MarketGraphDataOptions = {
  assetClass?: 'stock' | 'etf' | 'crypto';
  preferredSymbols?: string[];
  limit?: number;
};

const loadInvestmentUniverse = unstable_cache(
  async () => getInvestmentUniverse(),
  ['market-graph-investment-universe-v1'],
  { revalidate: 300 },
);

export async function getMarketGraphData(options: MarketGraphDataOptions = {}) {
  const t0 = perfNow();
  const assets = await loadInvestmentUniverse();
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
  const selectedSymbols = selectedAssets.map((asset) => asset.symbol);

  const tData = perfNow();
  const [snapshots, historyBySymbol] = await Promise.all([
    loadQuoteSnapshots(selectedSymbols).catch(() => []),
    getMarketHistoryBarsBySymbols(selectedSymbols, 260).catch(
      () => ({} as Record<string, PersistedMarketHistoryBar[]>),
    ),
  ]);
  perfLog(`market-graph:data-fetch symbols=${selectedSymbols.length}`, tData);

  const histories = selectedAssets.map((asset) => {
    const history = (historyBySymbol[asset.symbol] ?? [])
      .slice()
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
    const closes = history.map((point) => point.close);
    return {
      assetId: asset.assetId,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      history,
      signal: closes.length > 1 ? deriveSignalSnapshot(asset.assetId, closes) : null,
    };
  });

  const result = {
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
  perfLog('market-graph:total', t0);
  return result;
}
