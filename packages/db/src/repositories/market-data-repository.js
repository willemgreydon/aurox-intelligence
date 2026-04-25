import { createDatabaseClient } from '../client';
const marketQuoteSnapshotsTable = 'app.market_quote_snapshots';
const marketDailyBarsTable = 'app.market_daily_bars';
const marketAssetProfilesTable = 'app.market_asset_profiles';
const cryptoGlobalMetricsTable = 'app.crypto_global_metrics';
function isMissingMarketDataSchemaError(error) {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return false;
    }
    const databaseError = error;
    return databaseError.code === '42P01' || databaseError.code === '42703';
}
function toNumber(value) {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function toIsoString(value) {
    if (!value) {
        return null;
    }
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
function mapQuoteRow(row) {
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
function mapHistoryRow(row) {
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
function mapAssetProfileRow(row) {
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
function mapCryptoGlobalMetricsRow(row) {
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
export async function getLatestMarketQuoteSnapshots(symbols) {
    const normalized = [...new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean))];
    const client = createDatabaseClient();
    if (!client.isConfigured || normalized.length === 0) {
        return [];
    }
    try {
        const placeholders = normalized.map((_, index) => `$${index + 1}`).join(', ');
        const rows = await client.query(`
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
      `, normalized);
        return rows.map(mapQuoteRow);
    }
    catch (error) {
        if (isMissingMarketDataSchemaError(error)) {
            return [];
        }
        throw error;
    }
}
export async function getLatestMarketQuoteSnapshot(symbol) {
    const [snapshot] = await getLatestMarketQuoteSnapshots([symbol]);
    return snapshot ?? null;
}
export async function upsertMarketQuoteSnapshots(snapshots) {
    const client = createDatabaseClient();
    if (!client.isConfigured || snapshots.length === 0) {
        return;
    }
    try {
        await client.transaction(async (transactionClient) => {
            for (const snapshot of snapshots) {
                await transactionClient.execute(`
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
          `, [
                    snapshot.symbol,
                    snapshot.assetId ?? null,
                    snapshot.price,
                    snapshot.change ?? null,
                    snapshot.changePercent ?? null,
                    snapshot.source,
                    snapshot.observedAt ?? null,
                ]);
            }
        });
    }
    catch (error) {
        if (isMissingMarketDataSchemaError(error)) {
            return;
        }
        throw error;
    }
}
export async function getMarketHistoryBars(symbol, limit = 90) {
    const normalized = symbol.trim();
    const client = createDatabaseClient();
    if (!client.isConfigured || !normalized) {
        return [];
    }
    try {
        const rows = await client.query(`
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
      `, [normalized, limit]);
        return rows.map(mapHistoryRow).sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
    }
    catch (error) {
        if (isMissingMarketDataSchemaError(error)) {
            return [];
        }
        throw error;
    }
}
export async function getMarketHistoryBarsBySymbols(symbols, limit = 24) {
    const normalized = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
    const client = createDatabaseClient();
    if (!client.isConfigured || normalized.length === 0 || limit <= 0) {
        return {};
    }
    try {
        const placeholders = normalized.map((_, index) => `$${index + 1}`).join(', ');
        const limitPlaceholder = `$${normalized.length + 1}`;
        const rows = await client.query(`
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
      `, [...normalized, limit]);
        return rows.reduce((acc, row) => {
            const mapped = mapHistoryRow(row);
            const bucket = acc[mapped.symbol] ?? (acc[mapped.symbol] = []);
            bucket.push(mapped);
            return acc;
        }, {});
    }
    catch (error) {
        if (isMissingMarketDataSchemaError(error)) {
            return {};
        }
        throw error;
    }
}
export async function replaceMarketHistoryBars(symbol, bars) {
    const normalizedSymbol = symbol.trim();
    const client = createDatabaseClient();
    if (!client.isConfigured || !normalizedSymbol || bars.length === 0) {
        return;
    }
    try {
        await client.transaction(async (transactionClient) => {
            await transactionClient.execute(`
          delete from ${marketDailyBarsTable}
          where symbol = $1
        `, [normalizedSymbol]);
            for (const bar of bars) {
                const observedOn = new Date(bar.timestamp).toISOString().slice(0, 10);
                await transactionClient.execute(`
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
          `, [normalizedSymbol, observedOn, bar.open, bar.high, bar.low, bar.close, bar.volume ?? null, bar.source]);
            }
        });
    }
    catch (error) {
        if (isMissingMarketDataSchemaError(error)) {
            return;
        }
        throw error;
    }
}
export async function getLatestMarketAssetProfile(symbol) {
    const normalized = symbol.trim().toUpperCase();
    const client = createDatabaseClient();
    if (!client.isConfigured || !normalized) {
        return null;
    }
    try {
        const rows = await client.query(`
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
      `, [normalized]);
        return rows[0] ? mapAssetProfileRow(rows[0]) : null;
    }
    catch (error) {
        if (isMissingMarketDataSchemaError(error)) {
            return null;
        }
        throw error;
    }
}
export async function upsertMarketAssetProfiles(profiles) {
    const client = createDatabaseClient();
    if (!client.isConfigured || profiles.length === 0) {
        return;
    }
    try {
        await client.transaction(async (transactionClient) => {
            for (const profile of profiles) {
                await transactionClient.execute(`
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
          `, [
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
                ]);
            }
        });
    }
    catch (error) {
        if (isMissingMarketDataSchemaError(error)) {
            return;
        }
        throw error;
    }
}
export async function getLatestCryptoGlobalMetrics() {
    const client = createDatabaseClient();
    if (!client.isConfigured) {
        return null;
    }
    try {
        const rows = await client.query(`
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
      `);
        return rows[0] ? mapCryptoGlobalMetricsRow(rows[0]) : null;
    }
    catch (error) {
        if (isMissingMarketDataSchemaError(error)) {
            return null;
        }
        throw error;
    }
}
export async function insertCryptoGlobalMetrics(metric) {
    const client = createDatabaseClient();
    if (!client.isConfigured) {
        return;
    }
    try {
        await client.execute(`
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
      `, [
            metric.observedAt,
            metric.activeCryptocurrencies ?? null,
            metric.markets ?? null,
            metric.totalMarketCapUsd ?? null,
            metric.totalVolume24hUsd ?? null,
            metric.bitcoinDominancePercent ?? null,
            metric.ethereumDominancePercent ?? null,
            metric.marketCapChange24hPercent ?? null,
            metric.source,
        ]);
    }
    catch (error) {
        if (isMissingMarketDataSchemaError(error)) {
            return;
        }
        throw error;
    }
}
