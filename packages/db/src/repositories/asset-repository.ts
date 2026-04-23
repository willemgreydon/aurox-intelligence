import type { ActionAvailability, Asset } from '@repo/api-contracts';
import { assetSchema } from '@repo/api-contracts';
import { createDatabaseClient } from '../client';
import { investmentUniverse, type InvestmentUniverseAsset } from './investment-universe-repository';

const marketAssetsTable = 'app.market_assets';

type CatalogAssetClass = 'stock' | 'etf' | 'crypto' | 'fx' | 'index';

type MarketAssetRow = {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: CatalogAssetClass;
  category: string;
  geography: string | null;
  sector: string | null;
  thesis: string;
  riskSummary: string;
  actionAvailability: ActionAvailability;
  isSimulated: boolean;
  isTradable: boolean;
};

export type CatalogAsset = {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: CatalogAssetClass;
  category: string;
  geography: string | null;
  sector: string | null;
  thesis: string;
  riskSummary: string;
  actionAvailability: ActionAvailability;
  isSimulated: boolean;
  isTradable: boolean;
};

export type MarketAssetUpsertInput = {
  assetId?: string;
  symbol: string;
  name: string;
  assetClass: CatalogAssetClass;
  category?: string | null;
  geography?: string | null;
  sector?: string | null;
  thesis?: string | null;
  riskSummary?: string | null;
  actionAvailability?: ActionAvailability | null;
  isSimulated?: boolean | null;
  isTradable?: boolean | null;
};

function isMissingMarketAssetsError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const databaseError = error as { code?: string };
  return databaseError.code === '42P01' || databaseError.code === '42703';
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sanitizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildAssetId(assetClass: CatalogAssetClass, symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol)
    .replace(/:/g, '-')
    .replace(/\//g, '-')
    .replace(/_/g, '-')
    .replace(/\./g, '-');

  return `${assetClass}-${sanitizeSlug(normalizedSymbol)}`;
}

function defaultCategoryForAssetClass(assetClass: CatalogAssetClass) {
  switch (assetClass) {
    case 'stock':
      return 'Provider-seeded equity';
    case 'etf':
      return 'Provider-seeded ETF';
    case 'crypto':
      return 'Provider-seeded crypto';
    case 'index':
      return 'Provider-seeded index';
    case 'fx':
      return 'Provider-seeded FX';
    default:
      return 'Provider-seeded asset';
  }
}

function defaultThesisForAssetClass(assetClass: CatalogAssetClass, name: string, symbol: string) {
  switch (assetClass) {
    case 'stock':
      return `${name} (${symbol}) is tracked as a liquid equity candidate for market intelligence, simulation trading, and future gated live workflows.`;
    case 'etf':
      return `${name} (${symbol}) is tracked as a diversified ETF candidate for allocation analysis, simulation trading, and future gated live workflows.`;
    case 'crypto':
      return `${name} (${symbol}) is tracked as a digital asset candidate for market intelligence, simulation trading, and future gated live workflows.`;
    case 'index':
      return `${name} (${symbol}) is tracked as a market regime benchmark for analytics, comparison, and signal context.`;
    case 'fx':
      return `${name} (${symbol}) is tracked as a foreign-exchange benchmark for macro and cross-asset context.`;
    default:
      return `${name} (${symbol}) is tracked as a provider-backed market candidate.`;
  }
}

function defaultRiskSummaryForAssetClass(assetClass: CatalogAssetClass) {
  switch (assetClass) {
    case 'stock':
      return 'Equity risk includes earnings volatility, sentiment shifts, liquidity shocks, and valuation compression.';
    case 'etf':
      return 'ETF risk includes broad market drawdowns, factor concentration, and liquidity dislocations in stressed conditions.';
    case 'crypto':
      return 'Crypto risk includes extreme volatility, liquidity shocks, exchange dependency, and regulatory headline risk.';
    case 'index':
      return 'Index exposure reflects broad market regime shifts and cannot be assumed to be directly tradable in every execution mode.';
    case 'fx':
      return 'FX exposure reflects macro, rate, policy, and liquidity regime changes.';
    default:
      return 'Market risk can increase quickly during regime changes and volatile liquidity conditions.';
  }
}

function defaultActionAvailability(assetClass: CatalogAssetClass, isTradable: boolean, isSimulated: boolean): ActionAvailability {
  if (isTradable && isSimulated && (assetClass === 'stock' || assetClass === 'etf' || assetClass === 'crypto')) {
    return 'simulated';
  }

  if (assetClass === 'index' || assetClass === 'fx') {
    return 'unavailable';
  }

  if (isTradable) {
    return 'planned';
  }

  return 'unavailable';
}

function defaultTradable(assetClass: CatalogAssetClass) {
  return assetClass === 'stock' || assetClass === 'etf' || assetClass === 'crypto';
}

function defaultSimulated(assetClass: CatalogAssetClass) {
  return assetClass === 'stock' || assetClass === 'etf' || assetClass === 'crypto';
}

function mapFallbackAsset(asset: InvestmentUniverseAsset): CatalogAsset {
  return {
    assetId: asset.assetId,
    symbol: normalizeSymbol(asset.symbol),
    name: asset.name,
    assetClass: asset.assetClass,
    category: asset.category,
    geography: asset.geography,
    sector: asset.sector,
    thesis: asset.thesis,
    riskSummary: asset.riskSummary,
    actionAvailability: asset.actionAvailability,
    isSimulated: asset.isSimulated,
    isTradable: asset.assetClass === 'stock' || asset.assetClass === 'etf' || asset.assetClass === 'crypto',
  };
}

function mapMarketAsset(row: MarketAssetRow): CatalogAsset {
  return {
    assetId: row.assetId,
    symbol: normalizeSymbol(row.symbol),
    name: row.name,
    assetClass: row.assetClass,
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

function listFallbackAssets(assetClass?: CatalogAssetClass) {
  const fallback = investmentUniverse.map(mapFallbackAsset);

  if (!assetClass) {
    return fallback;
  }

  return fallback.filter((asset) => asset.assetClass === assetClass);
}

function sortCatalogAssets(left: CatalogAsset, right: CatalogAsset) {
  const order: Record<CatalogAssetClass, number> = {
    stock: 0,
    etf: 1,
    crypto: 2,
    index: 3,
    fx: 4,
  };

  if (order[left.assetClass] !== order[right.assetClass]) {
    return order[left.assetClass] - order[right.assetClass];
  }

  return left.symbol.localeCompare(right.symbol);
}

function buildUpsertRow(input: MarketAssetUpsertInput): Required<MarketAssetUpsertInput> {
  const symbol = normalizeSymbol(input.symbol);
  const assetClass = input.assetClass;
  const name = normalizeText(input.name) ?? symbol;
  const category = normalizeText(input.category) ?? defaultCategoryForAssetClass(assetClass);
  const geography = normalizeText(input.geography);
  const sector = normalizeText(input.sector);
  const isTradable = input.isTradable ?? defaultTradable(assetClass);
  const isSimulated = input.isSimulated ?? defaultSimulated(assetClass);
  const actionAvailability =
    input.actionAvailability ?? defaultActionAvailability(assetClass, isTradable, isSimulated);
  const thesis =
    normalizeText(input.thesis) ?? defaultThesisForAssetClass(assetClass, name, symbol);
  const riskSummary =
    normalizeText(input.riskSummary) ?? defaultRiskSummaryForAssetClass(assetClass);

  return {
    assetId: normalizeText(input.assetId) ?? buildAssetId(assetClass, symbol),
    symbol,
    name,
    assetClass,
    category,
    geography,
    sector,
    thesis,
    riskSummary,
    actionAvailability,
    isSimulated,
    isTradable,
  };
}

export async function listAssets(): Promise<Asset[]> {
  const assets = await listCatalogAssets();

  return assets
    .filter((asset) => asset.assetClass === 'stock' || asset.assetClass === 'etf' || asset.assetClass === 'crypto')
    .map((asset) =>
      assetSchema.parse({
        id: asset.assetId,
        symbol: asset.symbol,
        assetClass: asset.assetClass,
        name: asset.name,
      }),
    );
}

export async function listCatalogAssets(assetClass?: CatalogAssetClass): Promise<CatalogAsset[]> {
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

    if (rows.length === 0) {
      return listFallbackAssets(assetClass);
    }

    return rows.map(mapMarketAsset);
  } catch (error) {
    if (isMissingMarketAssetsError(error)) {
      return listFallbackAssets(assetClass);
    }

    throw error;
  }
}

export async function listCatalogAssetSymbols(): Promise<string[]> {
  const assets = await listCatalogAssets();
  return assets.map((asset) => asset.symbol);
}

export async function upsertMarketAssets(assets: MarketAssetUpsertInput[]): Promise<void> {
  const client = createDatabaseClient();

  if (!client.isConfigured || assets.length === 0) {
    return;
  }

  const prepared = assets
    .map(buildUpsertRow)
    .filter((asset, index, array) => array.findIndex((entry) => entry.symbol === asset.symbol) === index);

  if (prepared.length === 0) {
    return;
  }

  try {
    await client.transaction(async (transactionClient) => {
      for (const asset of prepared) {
        await transactionClient.execute(
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
              is_tradable,
              created_at,
              updated_at
            ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
            on conflict (symbol) do update set
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
            asset.assetId,
            asset.symbol,
            asset.name,
            asset.assetClass,
            asset.category,
            asset.geography,
            asset.sector,
            asset.thesis,
            asset.riskSummary,
            asset.actionAvailability,
            asset.isSimulated,
            asset.isTradable,
          ],
        );
      }
    });
  } catch (error) {
    if (isMissingMarketAssetsError(error)) {
      return;
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

export async function searchStockAssets(query: string): Promise<CatalogAsset[]> {
  const normalized = query.trim().toLowerCase();
  const assets = await listStockAssets();

  if (!normalized) {
    return assets;
  }

  return assets.filter((asset) =>
    asset.symbol.toLowerCase().includes(normalized) ||
    asset.name.toLowerCase().includes(normalized) ||
    asset.category.toLowerCase().includes(normalized) ||
    (asset.sector ?? '').toLowerCase().includes(normalized),
  );
}

export async function getCatalogAssetBySymbol(symbol: string): Promise<CatalogAsset | null> {
  const normalized = normalizeSymbol(symbol);

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

    return rows[0] ? mapMarketAsset(rows[0]) : listFallbackAssets().find((asset) => asset.symbol === normalized) ?? null;
  } catch (error) {
    if (isMissingMarketAssetsError(error)) {
      return listFallbackAssets().find((asset) => asset.symbol === normalized) ?? null;
    }

    throw error;
  }
}

export async function seedFallbackMarketAssets(): Promise<void> {
  const fallbackAssets = investmentUniverse.map((asset) =>
    buildUpsertRow({
      assetId: asset.assetId,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      category: asset.category,
      geography: asset.geography,
      sector: asset.sector,
      thesis: asset.thesis,
      riskSummary: asset.riskSummary,
      actionAvailability: asset.actionAvailability,
      isSimulated: asset.isSimulated,
      isTradable: asset.assetClass === 'stock' || asset.assetClass === 'etf' || asset.assetClass === 'crypto',
    }),
  );

  await upsertMarketAssets(fallbackAssets);
}

export async function mergeCatalogAssetsWithFallback(): Promise<CatalogAsset[]> {
  const [catalog, fallback] = await Promise.all([listCatalogAssets(), Promise.resolve(listFallbackAssets())]);

  const merged = new Map<string, CatalogAsset>();

  for (const asset of fallback) {
    merged.set(asset.symbol, asset);
  }

  for (const asset of catalog) {
    merged.set(asset.symbol, asset);
  }

  return [...merged.values()].sort(sortCatalogAssets);
}