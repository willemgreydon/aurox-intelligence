import { getProviderEnv, requireCoinGeckoApiKey } from '../../config';
import { buildUrl, fetchJson } from '../../shared/http-client';
import { createMissingConfigError } from '../errors';
import { assetMetadataSchema, cryptoGlobalMetricsSchema, marketHistoryPointSchema, marketObservationSchema } from '../schemas';
import { resolveCoinGeckoId } from '../provider-symbols';
export function isCoinGeckoConfigured() {
    return Boolean(getProviderEnv().COINGECKO_API_KEY);
}
function getHeaders() {
    return {
        accept: 'application/json',
        'x-cg-pro-api-key': requireCoinGeckoApiKey(),
    };
}
export async function fetchCoinGeckoQuote(symbol) {
    const coinId = resolveCoinGeckoId(symbol);
    if (!coinId) {
        throw createMissingConfigError('coingecko', `CoinGecko does not support symbol ${symbol}.`);
    }
    if (!isCoinGeckoConfigured()) {
        throw createMissingConfigError('coingecko', 'CoinGecko is not configured.');
    }
    const url = buildUrl('https://pro-api.coingecko.com/api/v3/simple/price', {
        ids: coinId,
        vs_currencies: 'usd',
        include_24hr_change: 'true',
        include_last_updated_at: 'true',
    });
    const response = await fetchJson(url, { headers: getHeaders() });
    const result = response[coinId];
    if (!result || typeof result.usd !== 'number') {
        throw new Error(`CoinGecko returned no quote for ${symbol}.`);
    }
    return marketObservationSchema.parse({
        symbol,
        assetKind: 'crypto',
        price: result.usd,
        timestamp: new Date((result.last_updated_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        source: 'coingecko',
        currency: 'USD',
        ...(typeof result.usd_24h_change === 'number' ? { changePercent: result.usd_24h_change } : {}),
    });
}
export async function fetchCoinGeckoHistory(symbol) {
    const coinId = resolveCoinGeckoId(symbol);
    if (!coinId) {
        throw createMissingConfigError('coingecko', `CoinGecko does not support symbol ${symbol}.`);
    }
    if (!isCoinGeckoConfigured()) {
        throw createMissingConfigError('coingecko', 'CoinGecko is not configured.');
    }
    const url = buildUrl(`https://pro-api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
        vs_currency: 'usd',
        days: 90,
        interval: 'daily',
    });
    const response = await fetchJson(url, { headers: getHeaders() });
    const volumeByTimestamp = new Map((response.total_volumes ?? []).map((point) => [point[0], point[1]]));
    return (response.prices ?? []).map(([timestamp, close], index, list) => {
        const previousClose = index > 0 ? list[index - 1][1] : close;
        const volume = volumeByTimestamp.get(timestamp);
        return marketHistoryPointSchema.parse({
            symbol,
            assetKind: 'crypto',
            timestamp: new Date(timestamp).toISOString(),
            open: previousClose,
            high: Math.max(previousClose, close),
            low: Math.min(previousClose, close),
            close,
            ...(volume !== undefined ? { volume } : {}),
            source: 'coingecko',
        });
    });
}
export async function fetchCoinGeckoMetadata(symbol) {
    const coinId = resolveCoinGeckoId(symbol);
    if (!coinId) {
        throw createMissingConfigError('coingecko', `CoinGecko does not support metadata for ${symbol}.`);
    }
    if (!isCoinGeckoConfigured()) {
        throw createMissingConfigError('coingecko', 'CoinGecko is not configured.');
    }
    const url = buildUrl(`https://pro-api.coingecko.com/api/v3/coins/${coinId}`, {
        localization: 'false',
        market_data: 'true',
        community_data: 'false',
        developer_data: 'false',
        sparkline: 'false',
    });
    const result = await fetchJson(url, { headers: getHeaders() });
    if (!result.id || !result.name) {
        throw new Error(`CoinGecko returned no metadata for ${symbol}.`);
    }
    return assetMetadataSchema.parse({
        symbol,
        assetKind: 'crypto',
        name: result.name,
        currency: 'USD',
        description: result.description?.en ?? null,
        website: result.links?.homepage?.[0] ?? null,
        logoUrl: result.image?.large ?? null,
        marketCap: result.market_data?.market_cap?.usd ?? null,
        source: 'coingecko',
        updatedAt: new Date().toISOString(),
    });
}
export async function fetchCoinGeckoGlobalMetrics() {
    if (!isCoinGeckoConfigured()) {
        throw createMissingConfigError('coingecko', 'CoinGecko is not configured.');
    }
    const url = 'https://pro-api.coingecko.com/api/v3/global';
    const response = await fetchJson(url, { headers: getHeaders() });
    const data = response.data;
    if (!data) {
        throw new Error('CoinGecko returned no global metrics.');
    }
    return cryptoGlobalMetricsSchema.parse({
        activeCryptocurrencies: data.active_cryptocurrencies ?? null,
        markets: data.markets ?? null,
        totalMarketCapUsd: data.total_market_cap?.usd ?? null,
        totalVolume24hUsd: data.total_volume?.usd ?? null,
        bitcoinDominancePercent: data.market_cap_percentage?.btc ?? null,
        ethereumDominancePercent: data.market_cap_percentage?.eth ?? null,
        marketCapChange24hPercent: data.market_cap_change_percentage_24h_usd ?? null,
        source: 'coingecko',
        observedAt: new Date((data.updated_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    });
}
