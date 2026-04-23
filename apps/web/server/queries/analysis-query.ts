import { fetchMarketHistory, fetchMarketSnapshot, getMarketSymbols, getProviderEnv } from '@repo/providers';
import { getDashboardReadModel, type DashboardOperationalReadModel } from '@repo/db';

export type AssetAnalysisReadModel = {
  assetId: string;
  symbol: string;
  assetClass: 'stock';
  observation: Awaited<ReturnType<typeof fetchMarketSnapshot>>[number] | null;
  history: Awaited<ReturnType<typeof fetchMarketHistory>>;
};

export type AnalysisReadModel = {
  provider: string;
  providerError: string | null;
  dashboard: DashboardOperationalReadModel;
  assets: AssetAnalysisReadModel[];
};

function toAssetId(symbol: string) {
  return symbol.replace('.US', '');
}

export async function getAnalysisReadModel(): Promise<AnalysisReadModel> {
  const env = getProviderEnv();
  const dashboard = await getDashboardReadModel();
  const symbols = getMarketSymbols(env.MARKET_DATA_PROVIDER);

  const assets = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const [snapshotResult, history] = await Promise.all([
          fetchMarketSnapshot({
            provider: env.MARKET_DATA_PROVIDER,
            symbols: [symbol],
          }),
          fetchMarketHistory({
            provider: env.MARKET_DATA_PROVIDER,
            symbol,
          }),
        ]);
        const [observation] = snapshotResult;

        return {
          assetId: toAssetId(symbol),
          symbol: toAssetId(symbol),
          assetClass: 'stock' as const,
          observation: observation ?? null,
          history,
          error: null as string | null,
        };
      } catch (error) {
        return {
          assetId: toAssetId(symbol),
          symbol: toAssetId(symbol),
          assetClass: 'stock' as const,
          observation: null,
          history: [],
          error: error instanceof Error ? error.message : `Unable to fetch analysis data for ${symbol}.`,
        };
      }
    }),
  );

  return {
    provider: env.MARKET_DATA_PROVIDER,
    providerError: assets.find((asset) => asset.error)?.error ?? null,
    dashboard,
    assets: assets.map(({ error: _error, ...asset }) => asset),
  };
}
