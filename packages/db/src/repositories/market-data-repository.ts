import { createDatabaseClient } from '../client';

const marketQuoteSnapshotsTable = 'app.market_quote_snapshots';
const marketDailyBarsTable = 'app.market_daily_bars';
const marketAssetProfilesTable = 'app.market_asset_profiles';
const cryptoGlobalMetricsTable = 'app.crypto_global_metrics';

type QuoteSnapshotRow = {
  symbol: string;
  assetId: string | null;
  price: number | string | null;
  changeAmount: number | string | null;
  changePercent: number | string | null;
  source: string;
  observedAt: string | Date | null;
  fetchedAt: string | Date;
};

type DailyBarRow = {
  symbol: string;
  observedOn: string | Date;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string | null;
  source: string;
  fetchedAt: string | Date;
};

type RankedDailyBarRow = DailyBarRow & {
  rowNum: number;
};

type AssetProfileRow = {
  symbol: string;
  assetId: string | null;
  assetClass: 'stock' | 'etf' | 'crypto';
  name: string;
  exchange: string | null;
  currency: string | null;
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  marketCap: number | string | null;
  source: string;
  updatedAt: string | Date;
  fetchedAt: string | Date;
};

type CryptoGlobalMetricsRow = {
  observedAt: string | Date;
  activeCryptocurrencies: number | null;
  markets: number | null;
  totalMarketCapUsd: number | string | null;
  totalVolume24hUsd: number | string | null;
  bitcoinDominancePercent: number | string | null;
  ethereumDominancePercent: number | string | null;
  marketCapChange24hPercent: number | string | null;
  source: string;
  fetchedAt: string | Date;
};

export type PersistedMarketQuoteSnapshot = {
  symbol: string;
  assetId: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  source: string;
  observedAt: string | null;
  fetchedAt: string;
};

export type PersistedMarketHistoryBar = {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  source: string;
  fetchedAt: string;
};

export type MarketQuoteSnapshotInput = {
  symbol: string;
  assetId?: string | null;
  price: number | null;
  change?: number | null;
  changePercent?: number | null;
  source: string;
  observedAt?: string | null;
};

export type MarketHistoryBarInput = {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
  source: string;
};

export type MarketAssetProfileInput = {
  symbol: string;
  assetId?: string | null;
  assetClass: 'stock' | 'etf' | 'crypto';
  name: string;
  exchange?: string | null;
  currency?: string | null;
  description?: string | null;
  sector?: string | null;
  industry?: string | null;
  country?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  marketCap?: number | null;
  source: string;
  updatedAt: string;
};

export type CryptoGlobalMetricsInput = {
  observedAt: string;
  activeCryptocurrencies?: number | null;
  markets?: number | null;
  totalMarketCapUsd?: number | null;
  totalVolume24hUsd?: number | null;
  bitcoinDominancePercent?: number | null;
  ethereumDominancePercent?: number | null;
  marketCapChange24hPercent?: number | null;
  source: string;
};

export type PersistedMarketAssetProfile = {
  symbol: string;
  assetId: string | null;
  assetClass: 'stock' | 'etf' | 'crypto';
  name: string;
  exchange: string | null;
  currency: string | null;
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  marketCap: number | null;
  source: string;
  updatedAt: string;
  fetchedAt: string;
};

export type PersistedCryptoGlobalMetrics = {
  observedAt: string;
  activeCryptocurrencies: number | null;
  markets: number | null;
  totalMarketCapUsd: number | null;
  totalVolume24hUsd: number | null;
  bitcoinDominancePercent: number | null;
  ethereumDominancePercent: number | null;
  marketCapChange24hPercent: number | null;
  source: string;
  fetchedAt: string;
};

function isMissingMarketDataSchemaError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const databaseError = error as { code?: string };
  return databaseError.code === '42P01' || databaseError.code === '42703';
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toIsoString(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapQuoteRow(row: QuoteSnapshotRow): PersistedMarketQuoteSnapshot {
  return {
    symbol: row.symbol,
    assetId: row.assetId,
    price: toNumber(row.price),
    change: toNumber(row.changeAmount),
    changePercent: toNumber(row.changePercent),
    source: row.source,
    observedAt: toIsoString(row.observedAt),
    fetchedAt: toIsoString(row.fetchedAt) ?? new Date().toISOString(),
  };
}

function mapHistoryRow(row: DailyBarRow): PersistedMarketHistoryBar {
  return {
    symbol: row.symbol,
    timestamp: toIsoString(row.observedOn) ?? new Date().toISOString(),
    open: toNumber(row.open) ?? 0,
    high: toNumber(row.high) ?? 0,
    low: toNumber(row.low) ?? 0,
    close: toNumber(row.close) ?? 0,
    volume: toNumber(row.volume),
    source: row.source,
    fetchedAt: toIsoString(row.fetchedAt) ?? new Date().toISOString(),
  };
}

function mapAssetProfileRow(row: AssetProfileRow): PersistedMarketAssetProfile {
  return {
    symbol: row.symbol,
    assetId: row.assetId,
    assetClass: row.assetClass,
    name: row.name,
    exchange: row.exchange,
    currency: row.currency,
    description: row.description,
    sector: row.sector,
    industry: row.industry,
    country: row.country,
    websiteUrl: row.websiteUrl,
    logoUrl: row.logoUrl,
    marketCap: toNumber(row.marketCap),
    source: row.source,
    updatedAt: toIsoString(row.updatedAt) ?? new Date().toISOString(),
    fetchedAt: toIsoString(row.fetchedAt) ?? new Date().toISOString(),
  };
}

function mapCryptoGlobalMetricsRow(row: CryptoGlobalMetricsRow): PersistedCryptoGlobalMetrics {
  return {
    observedAt: toIsoString(row.observedAt) ?? new Date().toISOString(),
    activeCryptocurrencies: row.activeCryptocurrencies,
    markets: row.markets,
    totalMarketCapUsd: toNumber(row.totalMarketCapUsd),
    totalVolume24hUsd: toNumber(row.totalVolume24hUsd),
    bitcoinDominancePercent: toNumber(row.bitcoinDominancePercent),
    ethereumDominancePercent: toNumber(row.ethereumDominancePercent),
    marketCapChange24hPercent: toNumber(row.marketCapChange24hPercent),
    source: row.source,
    fetchedAt: toIsoString(row.fetchedAt) ?? new Date().toISOString(),
  };
}

export async function getLatestMarketQuoteSnapshots(symbols: string[]): Promise<PersistedMarketQuoteSnapshot[]> {
  const normalized = [...new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean))];
  const client = createDatabaseClient();

  if (!client.isConfigured || normalized.length === 0) {
    return [];
  }

  try {
    const placeholders = normalized.map((_, index) => `$${index + 1}`).join(', ');
    const rows = await client.query<QuoteSnapshotRow>(
      `
        select
          symbol,
          asset_id as "assetId",
          price,
          change_amount as "changeAmount",
          change_percent as "changePercent",
          source,
          observed_at as "observedAt",
          fetched_at as "fetchedAt"
        from ${marketQuoteSnapshotsTable}
        where symbol in (${placeholders})
      `,
      normalized,
    );

    return rows.map(mapQuoteRow);
  } catch (error) {
    if (isMissingMarketDataSchemaError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getLatestMarketQuoteSnapshot(symbol: string): Promise<PersistedMarketQuoteSnapshot | null> {
  const [snapshot] = await getLatestMarketQuoteSnapshots([symbol]);
  return snapshot ?? null;
}

export async function upsertMarketQuoteSnapshots(snapshots: MarketQuoteSnapshotInput[]): Promise<void> {
  const client = createDatabaseClient();

  if (!client.isConfigured || snapshots.length === 0) {
    return;
  }

  try {
    await client.transaction(async (transactionClient) => {
      for (const snapshot of snapshots) {
        await transactionClient.execute(
          `
            insert into ${marketQuoteSnapshotsTable} (
              symbol,
              asset_id,
              price,
              change_amount,
              change_percent,
              source,
              observed_at,
              fetched_at
            ) values ($1, $2, $3, $4, $5, $6, $7, now())
            on conflict (symbol) do update set
              asset_id = excluded.asset_id,
              price = excluded.price,
              change_amount = excluded.change_amount,
              change_percent = excluded.change_percent,
              source = excluded.source,
              observed_at = excluded.observed_at,
              fetched_at = now()
          `,
          [
            snapshot.symbol,
            snapshot.assetId ?? null,
            snapshot.price,
            snapshot.change ?? null,
            snapshot.changePercent ?? null,
            snapshot.source,
            snapshot.observedAt ?? null,
          ],
        );
      }
    });
  } catch (error) {
    if (isMissingMarketDataSchemaError(error)) {
      return;
    }

    throw error;
  }
}

export async function getMarketHistoryBars(symbol: string, limit = 90): Promise<PersistedMarketHistoryBar[]> {
  const normalized = symbol.trim();
  const client = createDatabaseClient();

  if (!client.isConfigured || !normalized) {
    return [];
  }

  try {
    const rows = await client.query<DailyBarRow>(
      `
        select
          symbol,
          observed_on as "observedOn",
          open,
          high,
          low,
          close,
          volume,
          source,
          fetched_at as "fetchedAt"
        from ${marketDailyBarsTable}
        where symbol = $1
        order by observed_on desc
        limit $2
      `,
      [normalized, limit],
    );

    return rows.map(mapHistoryRow).sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
  } catch (error) {
    if (isMissingMarketDataSchemaError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getMarketHistoryBarsBySymbols(
  symbols: string[],
  limit = 24,
): Promise<Record<string, PersistedMarketHistoryBar[]>> {
  const normalized = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
  const client = createDatabaseClient();

  if (!client.isConfigured || normalized.length === 0 || limit <= 0) {
    return {};
  }

  try {
    const placeholders = normalized.map((_, index) => `$${index + 1}`).join(', ');
    const limitPlaceholder = `$${normalized.length + 1}`;
    const rows = await client.query<RankedDailyBarRow>(
      `
        select
          ranked.symbol,
          ranked."observedOn",
          ranked.open,
          ranked.high,
          ranked.low,
          ranked.close,
          ranked.volume,
          ranked.source,
          ranked."fetchedAt",
          ranked."rowNum"
        from (
          select
            symbol,
            observed_on as "observedOn",
            open,
            high,
            low,
            close,
            volume,
            source,
            fetched_at as "fetchedAt",
            row_number() over (partition by symbol order by observed_on desc) as "rowNum"
          from ${marketDailyBarsTable}
          where symbol in (${placeholders})
        ) ranked
        where ranked."rowNum" <= ${limitPlaceholder}
        order by ranked.symbol asc, ranked."observedOn" asc
      `,
      [...normalized, limit],
    );

    return rows.reduce<Record<string, PersistedMarketHistoryBar[]>>((acc, row) => {
      const mapped = mapHistoryRow(row);
      const bucket = acc[mapped.symbol] ?? (acc[mapped.symbol] = []);
      bucket.push(mapped);
      return acc;
    }, {});
  } catch (error) {
    if (isMissingMarketDataSchemaError(error)) {
      return {};
    }

    throw error;
  }
}

export async function replaceMarketHistoryBars(symbol: string, bars: MarketHistoryBarInput[]): Promise<void> {
  const normalizedSymbol = symbol.trim();
  const client = createDatabaseClient();

  if (!client.isConfigured || !normalizedSymbol || bars.length === 0) {
    return;
  }

  try {
    await client.transaction(async (transactionClient) => {
      await transactionClient.execute(
        `
          delete from ${marketDailyBarsTable}
          where symbol = $1
        `,
        [normalizedSymbol],
      );

      for (const bar of bars) {
        const observedOn = new Date(bar.timestamp).toISOString().slice(0, 10);
        await transactionClient.execute(
          `
            insert into ${marketDailyBarsTable} (
              symbol,
              observed_on,
              open,
              high,
              low,
              close,
              volume,
              source,
              fetched_at
            ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())
          `,
          [normalizedSymbol, observedOn, bar.open, bar.high, bar.low, bar.close, bar.volume ?? null, bar.source],
        );
      }
    });
  } catch (error) {
    if (isMissingMarketDataSchemaError(error)) {
      return;
    }

    throw error;
  }
}

export async function getLatestMarketAssetProfile(symbol: string): Promise<PersistedMarketAssetProfile | null> {
  const normalized = symbol.trim().toUpperCase();
  const client = createDatabaseClient();

  if (!client.isConfigured || !normalized) {
    return null;
  }

  try {
    const rows = await client.query<AssetProfileRow>(
      `
        select
          symbol,
          asset_id as "assetId",
          asset_class as "assetClass",
          name,
          exchange,
          currency,
          description,
          sector,
          industry,
          country,
          website_url as "websiteUrl",
          logo_url as "logoUrl",
          market_cap as "marketCap",
          source,
          updated_at as "updatedAt",
          fetched_at as "fetchedAt"
        from ${marketAssetProfilesTable}
        where symbol = $1
        limit 1
      `,
      [normalized],
    );

    return rows[0] ? mapAssetProfileRow(rows[0]) : null;
  } catch (error) {
    if (isMissingMarketDataSchemaError(error)) {
      return null;
    }

    throw error;
  }
}

export async function upsertMarketAssetProfiles(profiles: MarketAssetProfileInput[]): Promise<void> {
  const client = createDatabaseClient();

  if (!client.isConfigured || profiles.length === 0) {
    return;
  }

  try {
    await client.transaction(async (transactionClient) => {
      for (const profile of profiles) {
        await transactionClient.execute(
          `
            insert into ${marketAssetProfilesTable} (
              symbol,
              asset_id,
              asset_class,
              name,
              exchange,
              currency,
              description,
              sector,
              industry,
              country,
              website_url,
              logo_url,
              market_cap,
              source,
              updated_at,
              fetched_at
            ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
            on conflict (symbol) do update set
              asset_id = excluded.asset_id,
              asset_class = excluded.asset_class,
              name = excluded.name,
              exchange = excluded.exchange,
              currency = excluded.currency,
              description = excluded.description,
              sector = excluded.sector,
              industry = excluded.industry,
              country = excluded.country,
              website_url = excluded.website_url,
              logo_url = excluded.logo_url,
              market_cap = excluded.market_cap,
              source = excluded.source,
              updated_at = excluded.updated_at,
              fetched_at = now()
          `,
          [
            profile.symbol,
            profile.assetId ?? null,
            profile.assetClass,
            profile.name,
            profile.exchange ?? null,
            profile.currency ?? null,
            profile.description ?? null,
            profile.sector ?? null,
            profile.industry ?? null,
            profile.country ?? null,
            profile.websiteUrl ?? null,
            profile.logoUrl ?? null,
            profile.marketCap ?? null,
            profile.source,
            profile.updatedAt,
          ],
        );
      }
    });
  } catch (error) {
    if (isMissingMarketDataSchemaError(error)) {
      return;
    }

    throw error;
  }
}

export async function getLatestCryptoGlobalMetrics(): Promise<PersistedCryptoGlobalMetrics | null> {
  const client = createDatabaseClient();

  if (!client.isConfigured) {
    return null;
  }

  try {
    const rows = await client.query<CryptoGlobalMetricsRow>(
      `
        select
          observed_at as "observedAt",
          active_cryptocurrencies as "activeCryptocurrencies",
          markets,
          total_market_cap_usd as "totalMarketCapUsd",
          total_volume_24h_usd as "totalVolume24hUsd",
          bitcoin_dominance_percent as "bitcoinDominancePercent",
          ethereum_dominance_percent as "ethereumDominancePercent",
          market_cap_change_24h_percent as "marketCapChange24hPercent",
          source,
          fetched_at as "fetchedAt"
        from ${cryptoGlobalMetricsTable}
        order by observed_at desc
        limit 1
      `,
    );

    return rows[0] ? mapCryptoGlobalMetricsRow(rows[0]) : null;
  } catch (error) {
    if (isMissingMarketDataSchemaError(error)) {
      return null;
    }

    throw error;
  }
}

export async function insertCryptoGlobalMetrics(metric: CryptoGlobalMetricsInput): Promise<void> {
  const client = createDatabaseClient();

  if (!client.isConfigured) {
    return;
  }

  try {
    await client.execute(
      `
        insert into ${cryptoGlobalMetricsTable} (
          observed_at,
          active_cryptocurrencies,
          markets,
          total_market_cap_usd,
          total_volume_24h_usd,
          bitcoin_dominance_percent,
          ethereum_dominance_percent,
          market_cap_change_24h_percent,
          source,
          fetched_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
        on conflict (observed_at) do update set
          active_cryptocurrencies = excluded.active_cryptocurrencies,
          markets = excluded.markets,
          total_market_cap_usd = excluded.total_market_cap_usd,
          total_volume_24h_usd = excluded.total_volume_24h_usd,
          bitcoin_dominance_percent = excluded.bitcoin_dominance_percent,
          ethereum_dominance_percent = excluded.ethereum_dominance_percent,
          market_cap_change_24h_percent = excluded.market_cap_change_24h_percent,
          source = excluded.source,
          fetched_at = now()
      `,
      [
        metric.observedAt,
        metric.activeCryptocurrencies ?? null,
        metric.markets ?? null,
        metric.totalMarketCapUsd ?? null,
        metric.totalVolume24hUsd ?? null,
        metric.bitcoinDominancePercent ?? null,
        metric.ethereumDominancePercent ?? null,
        metric.marketCapChange24hPercent ?? null,
        metric.source,
      ],
    );
  } catch (error) {
    if (isMissingMarketDataSchemaError(error)) {
      return;
    }

    throw error;
  }
}
