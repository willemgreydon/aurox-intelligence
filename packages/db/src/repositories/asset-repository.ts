import type { ActionAvailability, Asset, SimulationAssetScope } from '@repo/api-contracts';
import { assetSchema } from '@repo/api-contracts';
import { createDatabaseClient } from '../client';
import { investmentUniverse, searchInvestmentUniverse, type InvestmentUniverseAsset } from './investment-universe-repository';

const marketAssetsTable = 'app.market_assets';

type MarketAssetRow = {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'fx' | 'index';
  category: string;
  geography: string | null;
  sector: string | null;
  thesis: string;
  riskSummary: string;
  actionAvailability: ActionAvailability;
  isSimulated: boolean;
  isTradable: boolean;
};

export type CatalogAsset = InvestmentUniverseAsset & {
  isTradable: boolean;
};

export type UpsertMarketAssetInput = {
  assetId?: string;
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'fx' | 'index';
  category: string;
  geography: string | null;
  sector: string | null;
  thesis: string;
  riskSummary: string;
  actionAvailability: ActionAvailability;
  isSimulated: boolean;
  isTradable: boolean;
};

function isMissingMarketAssetsError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const databaseError = error as { code?: string };
  return databaseError.code === '42P01' || databaseError.code === '42703';
}

function buildMarketAssetId(symbol: string, assetClass: UpsertMarketAssetInput['assetClass']) {
  return `${assetClass}-${symbol.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export async function upsertMarketAssets(inputs: UpsertMarketAssetInput[]): Promise<void> {
  if (inputs.length === 0) {
    return;
  }

  const client = createDatabaseClient();
  if (!client.isConfigured) {
    return;
  }

  for (const input of inputs) {
    const symbol = input.symbol.trim().toUpperCase();

    if (!symbol) {
      continue;
    }

    const assetId = input.assetId?.trim() || buildMarketAssetId(symbol, input.assetClass);

    await client.execute(
      `
        insert into ${marketAssetsTable} (
          asset_id,
          symbol,
          name,
          asset_class,
          category,
          geography,
          sector,
          thesis,
          risk_summary,
          action_availability,
          is_simulated,
          is_tradable
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        on conflict (symbol) do update
        set
          asset_id = excluded.asset_id,
          name = excluded.name,
          asset_class = excluded.asset_class,
          category = excluded.category,
          geography = excluded.geography,
          sector = excluded.sector,
          thesis = excluded.thesis,
          risk_summary = excluded.risk_summary,
          action_availability = excluded.action_availability,
          is_simulated = excluded.is_simulated,
          is_tradable = excluded.is_tradable,
          updated_at = now()
      `,
      [
        assetId,
        symbol,
        input.name,
        input.assetClass,
        input.category,
        input.geography,
        input.sector,
        input.thesis,
        input.riskSummary,
        input.actionAvailability,
        input.isSimulated,
        input.isTradable,
      ],
    );
  }
}

export function isAssetSimulationTradable(
  asset:
    | Pick<CatalogAsset, 'assetClass' | 'isSimulated' | 'isTradable' | 'actionAvailability'>
    | null
    | undefined,
) {
  if (!asset) {
    return false;
  }

  if (!asset.isSimulated || !asset.isTradable) {
    return false;
  }

  if (asset.actionAvailability === 'unavailable') {
    return false;
  }

  return asset.assetClass === 'stock' || asset.assetClass === 'etf' || asset.assetClass === 'crypto';
}

function mapFallbackAsset(asset: InvestmentUniverseAsset): CatalogAsset {
  return {
    ...asset,
    isTradable:
      asset.assetClass === 'stock' ||
      asset.assetClass === 'etf' ||
      asset.assetClass === 'crypto',
  };
}

function mapMarketAsset(row: MarketAssetRow): CatalogAsset {
  return {
    assetId: row.assetId,
    symbol: row.symbol,
    name: row.name,
    assetClass: row.assetClass as InvestmentUniverseAsset['assetClass'],
    category: row.category,
    geography: row.geography,
    sector: row.sector,
    thesis: row.thesis,
    riskSummary: row.riskSummary,
    actionAvailability: row.actionAvailability,
    isSimulated: row.isSimulated,
    isTradable: row.isTradable,
  };
}

function listFallbackAssets(assetClass?: InvestmentUniverseAsset['assetClass']) {
  return investmentUniverse
    .filter((asset) => (assetClass ? asset.assetClass === assetClass : true))
    .map(mapFallbackAsset);
}

function mergeCatalogAssetsWithFallback(
  fallbackAssets: CatalogAsset[],
  persistedAssets: CatalogAsset[],
): CatalogAsset[] {
  if (persistedAssets.length === 0) {
    return fallbackAssets;
  }

  const persistedBySymbol = new Map(persistedAssets.map((asset) => [asset.symbol, asset]));
  const merged = fallbackAssets.map((asset) => persistedBySymbol.get(asset.symbol) ?? asset);
  const knownSymbols = new Set(merged.map((asset) => asset.symbol));
  const persistedOnly = persistedAssets.filter((asset) => !knownSymbols.has(asset.symbol));

  return [...merged, ...persistedOnly];
}

export async function listAssets(): Promise<Asset[]> {
  const assets = await listCatalogAssets();

  return assets
    .filter(
      (asset) =>
        asset.assetClass === 'stock' ||
        asset.assetClass === 'etf' ||
        asset.assetClass === 'crypto',
    )
    .map((asset) =>
      assetSchema.parse({
        id: asset.assetId,
        symbol: asset.symbol,
        assetClass: asset.assetClass,
        name: asset.name,
      }),
    );
}

export async function listCatalogAssets(
  assetClass?: InvestmentUniverseAsset['assetClass'],
): Promise<CatalogAsset[]> {
  const client = createDatabaseClient();

  if (!client.isConfigured) {
    return listFallbackAssets(assetClass);
  }

  try {
    const params: Array<string> = [];
    const whereClause = assetClass ? `where asset_class = $1` : '';

    if (assetClass) {
      params.push(assetClass);
    }

    const rows = await client.query<MarketAssetRow>(
      `
        select
          asset_id as "assetId",
          symbol,
          name,
          asset_class as "assetClass",
          category,
          geography,
          sector,
          thesis,
          risk_summary as "riskSummary",
          action_availability as "actionAvailability",
          is_simulated as "isSimulated",
          is_tradable as "isTradable"
        from ${marketAssetsTable}
        ${whereClause}
        order by
          case asset_class
            when 'stock' then 0
            when 'etf' then 1
            when 'crypto' then 2
            when 'index' then 3
            when 'fx' then 4
            else 5
          end,
          symbol asc
      `,
      params,
    );

    const fallbackAssets = listFallbackAssets(assetClass);
    const persistedAssets = rows.map(mapMarketAsset);
    return mergeCatalogAssetsWithFallback(fallbackAssets, persistedAssets);
  } catch (error) {
    if (isMissingMarketAssetsError(error)) {
      return listFallbackAssets(assetClass);
    }

    throw error;
  }
}

export async function listStockAssets(): Promise<CatalogAsset[]> {
  return listCatalogAssets('stock');
}

export async function listTradableCatalogAssets(): Promise<CatalogAsset[]> {
  const assets = await listCatalogAssets();
  return assets.filter((asset) => asset.isTradable);
}

export async function listSimulationTradableAssets(
  assetScope: SimulationAssetScope = 'multi-asset',
): Promise<CatalogAsset[]> {
  const assets = await listCatalogAssets();
  const simulationTradableAssets = assets.filter((asset) => isAssetSimulationTradable(asset));

  if (assetScope === 'multi-asset') {
    return simulationTradableAssets;
  }

  return simulationTradableAssets.filter((asset) => asset.assetClass === assetScope);
}

export async function searchStockAssets(query: string): Promise<CatalogAsset[]> {
  const normalized = query.trim().toLowerCase();
  const assets = await listStockAssets();

  if (!normalized) {
    return assets;
  }
  const matchedSymbols = new Set(
    searchInvestmentUniverse(normalized, { assetClass: 'stock' }).map((asset) => asset.symbol),
  );

  return assets.filter((asset) => matchedSymbols.has(asset.symbol));
}

export async function getCatalogAssetBySymbol(symbol: string): Promise<CatalogAsset | null> {
  const normalized = symbol.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  const client = createDatabaseClient();

  if (!client.isConfigured) {
    return listFallbackAssets().find((asset) => asset.symbol === normalized) ?? null;
  }

  try {
    const rows = await client.query<MarketAssetRow>(
      `
        select
          asset_id as "assetId",
          symbol,
          name,
          asset_class as "assetClass",
          category,
          geography,
          sector,
          thesis,
          risk_summary as "riskSummary",
          action_availability as "actionAvailability",
          is_simulated as "isSimulated",
          is_tradable as "isTradable"
        from ${marketAssetsTable}
        where symbol = $1
        limit 1
      `,
      [normalized],
    );

    return rows[0]
      ? mapMarketAsset(rows[0])
      : listFallbackAssets().find((asset) => asset.symbol === normalized) ?? null;
  } catch (error) {
    if (isMissingMarketAssetsError(error)) {
      return listFallbackAssets().find((asset) => asset.symbol === normalized) ?? null;
    }

    throw error;
  }
}
