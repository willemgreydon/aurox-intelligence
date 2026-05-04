import type { CatalogAsset } from '@repo/db';
import { getSimulationWorkstationStateForCurrentUser } from '../services/simulation-workstation-service';
import { loadMiniHistorySeries } from '../services/stock-simulation-service';
import { withDbReadFallback } from '../lib/db-runtime';

export type PortfolioReadModel = {
  workstation: Awaited<ReturnType<typeof getSimulationWorkstationStateForCurrentUser>>;
  sparklineBySymbol: Record<string, number[]>;
  assetBySymbol: Map<string, CatalogAsset>;
  watchedAssetIds: Set<string>;
};

export async function getPortfolioReadModel(): Promise<PortfolioReadModel> {
  const workstation = (await withDbReadFallback(
    'portfolio-query:getSimulationWorkstationStateForCurrentUser',
    {
      session: null,
      workspace: null,
      activityLanes: [],
      tradableAssets: [],
      watchlist: [],
      equityCurve: [],
      positionsByAssetClass: [],
      isReadOnly: true,
      workstationStatus: 'degraded' as const,
      statusMessage: 'Database unavailable.',
    },
    () => getSimulationWorkstationStateForCurrentUser({ sessionId: null }),
  )).value;

  const symbols = [
    ...new Set([
      ...(workstation.workspace?.positions ?? []).map((position) => position.symbol),
      ...(workstation.workspace?.closedPositions ?? []).map((position) => position.symbol),
      ...workstation.watchlist.map((item) => item.asset.symbol),
      ...workstation.tradableAssets.map((item) => item.asset.symbol),
    ]),
  ];

  const sparklineBySymbol = (await withDbReadFallback('portfolio-query:loadMiniHistorySeries', {}, () =>
    loadMiniHistorySeries(symbols, 24),
  )).value;

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
