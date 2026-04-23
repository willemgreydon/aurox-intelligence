import type { CatalogAsset } from '@repo/db';
import { getSimulationWorkstationStateForCurrentUser } from '../services/simulation-workstation-service';
import { loadMiniHistorySeries } from '../services/stock-simulation-service';

export type PortfolioReadModel = {
  workstation: Awaited<ReturnType<typeof getSimulationWorkstationStateForCurrentUser>>;
  sparklineBySymbol: Record<string, number[]>;
  assetBySymbol: Map<string, CatalogAsset>;
  watchedAssetIds: Set<string>;
};

export async function getPortfolioReadModel(): Promise<PortfolioReadModel> {
  const workstation = await getSimulationWorkstationStateForCurrentUser({ sessionId: null });

  const symbols = [
    ...new Set([
      ...(workstation.workspace?.positions ?? []).map((position) => position.symbol),
      ...(workstation.workspace?.closedPositions ?? []).map((position) => position.symbol),
      ...workstation.watchlist.map((item) => item.asset.symbol),
      ...workstation.tradableAssets.map((item) => item.asset.symbol),
    ]),
  ];

  const [sparklineBySymbol] = await Promise.all([
    loadMiniHistorySeries(symbols, 24),
  ]);

  const assetBySymbol = new Map<string, CatalogAsset>();
  for (const entry of workstation.tradableAssets) {
    assetBySymbol.set(entry.asset.symbol, entry.asset);
  }
  for (const entry of workstation.watchlist) {
    assetBySymbol.set(entry.asset.symbol, entry.asset);
  }

  return {
    workstation,
    sparklineBySymbol,
    assetBySymbol,
    watchedAssetIds: new Set(workstation.tradableAssets.filter((entry) => entry.isWatched).map((entry) => entry.asset.assetId)),
  };
}

