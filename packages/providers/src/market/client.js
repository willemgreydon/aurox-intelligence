import { fetchCoinGeckoGlobalMetrics, fetchCoinGeckoHistory, fetchCoinGeckoMetadata, fetchCoinGeckoQuote, } from './providers/coingecko';
import { fetchEodhdHistory, fetchEodhdQuote, fetchFinnhubHistory, fetchFinnhubQuote } from './providers/legacy';
import { fetchPolygonHistory, fetchPolygonMetadata, fetchPolygonQuote } from './providers/polygon';
import { fetchTiingoMetadata } from './providers/tiingo';
import { fetchTwelveDataHistory, fetchTwelveDataQuote } from './providers/twelve-data';
import { normalizeProviderError, toProviderError } from './errors';
import { recordProviderFailure, recordProviderSuccess } from './provider-registry';
import { getCryptoGlobalProviderChain, getHistoryProviderChain, getMetadataProviderChain, getProviderHealthStatusesSnapshot, getQuoteProviderChain, } from './routing';
const SNAPSHOT_BATCH_SIZE = 4;
async function fetchQuoteFromProvider(provider, symbol) {
    switch (provider) {
        case 'polygon':
            return fetchPolygonQuote(symbol);
        case 'twelve-data':
            return fetchTwelveDataQuote(symbol);
        case 'coingecko':
            return fetchCoinGeckoQuote(symbol);
        case 'finnhub':
            return fetchFinnhubQuote(symbol);
        case 'eodhd':
            return fetchEodhdQuote(symbol);
        case 'tiingo':
            throw new Error('Tiingo is not configured for quote reads.');
        default:
            throw new Error(`Unsupported quote provider ${provider}.`);
    }
}
async function fetchHistoryFromProvider(provider, symbol, from, to) {
    switch (provider) {
        case 'polygon':
            return fetchPolygonHistory(symbol, from, to);
        case 'twelve-data':
            return fetchTwelveDataHistory(symbol, from, to);
        case 'coingecko':
            return fetchCoinGeckoHistory(symbol);
        case 'finnhub':
            return fetchFinnhubHistory(symbol, from, to);
        case 'eodhd':
            return fetchEodhdHistory(symbol, from, to);
        case 'tiingo':
            throw new Error('Tiingo is not configured for history reads.');
        default:
            throw new Error(`Unsupported history provider ${provider}.`);
    }
}
async function fetchMetadataFromProvider(provider, symbol) {
    switch (provider) {
        case 'polygon':
            return fetchPolygonMetadata(symbol);
        case 'tiingo':
            return fetchTiingoMetadata(symbol);
        case 'coingecko':
            return fetchCoinGeckoMetadata(symbol);
        case 'twelve-data':
        case 'finnhub':
        case 'eodhd':
            throw new Error(`${provider} is not configured for metadata reads.`);
        default:
            throw new Error(`Unsupported metadata provider ${provider}.`);
    }
}
function buildSelection(kind, symbol, attemptedProviders, selectedProvider, errors) {
    return {
        kind,
        symbol,
        attemptedProviders,
        selectedProvider,
        fallbackUsed: selectedProvider !== null && attemptedProviders[0] !== selectedProvider,
        staleCacheEligible: true,
        errors,
    };
}
async function timedRead(provider, reader) {
    const startedAt = Date.now();
    try {
        const data = await reader();
        recordProviderSuccess(provider, Date.now() - startedAt);
        return data;
    }
    catch (error) {
        recordProviderFailure(provider, Date.now() - startedAt);
        throw error;
    }
}
async function readWithFallback(kind, symbol, providers, reader) {
    const attemptedProviders = [];
    const errors = [];
    for (const provider of providers) {
        attemptedProviders.push(provider);
        try {
            const data = await timedRead(provider, () => reader(provider));
            return {
                data,
                selection: buildSelection(kind, symbol, attemptedProviders, provider, errors),
            };
        }
        catch (error) {
            errors.push(toProviderError(normalizeProviderError(provider, error)));
        }
    }
    throw Object.assign(new Error(`No ${kind} provider succeeded for ${symbol ?? 'requested data'}.`), {
        selection: buildSelection(kind, symbol, attemptedProviders, null, errors),
    });
}
function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}
export async function readMarketQuote(symbol, provider) {
    return readWithFallback('quote', symbol, getQuoteProviderChain(symbol, provider), (selectedProvider) => fetchQuoteFromProvider(selectedProvider, symbol));
}
export async function readMarketHistory(symbol, from, to, provider) {
    return readWithFallback('history', symbol, getHistoryProviderChain(symbol, provider), (selectedProvider) => fetchHistoryFromProvider(selectedProvider, symbol, from, to));
}
export async function readAssetMetadata(symbol, provider) {
    return readWithFallback('metadata', symbol, getMetadataProviderChain(symbol, provider), (selectedProvider) => fetchMetadataFromProvider(selectedProvider, symbol));
}
export async function readCryptoGlobalMetrics(provider) {
    return readWithFallback('crypto-global', null, getCryptoGlobalProviderChain(provider), () => fetchCoinGeckoGlobalMetrics());
}
export async function fetchMarketSnapshot(options = {}) {
    const symbols = [...new Set((options.symbols ?? []).map((symbol) => symbol.trim()).filter(Boolean))];
    if (symbols.length === 0) {
        return [];
    }
    const chunks = chunkArray(symbols, SNAPSHOT_BATCH_SIZE);
    const collected = [];
    for (const chunk of chunks) {
        const results = await Promise.allSettled(chunk.map((symbol) => readMarketQuote(symbol, options.provider)));
        for (const result of results) {
            if (result.status === 'fulfilled') {
                collected.push(result.value.data);
            }
        }
    }
    return collected;
}
export async function fetchMarketHistory(options) {
    const result = await readMarketHistory(options.symbol, options.from, options.to, options.provider);
    return result.data;
}
export async function fetchAssetMetadata(options) {
    const result = await readAssetMetadata(options.symbol, options.provider);
    return result.data;
}
export async function fetchCryptoGlobalMetrics(options = {}) {
    const result = await readCryptoGlobalMetrics(options.provider);
    return result.data;
}
export function getProviderHealthStatus() {
    return getProviderHealthStatusesSnapshot();
}
