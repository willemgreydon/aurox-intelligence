import { getProviderEnv } from '../config';
const DEFAULT_NEWS_TIMEOUT_MS = 2_500;
const DEFAULT_SYMBOL_CONCURRENCY = 5;
function normalizeSymbol(symbol) {
    return symbol.trim().toUpperCase();
}
function toIso(value) {
    if (typeof value !== 'string' || !value) {
        return new Date().toISOString();
    }
    const t = new Date(value).toISOString();
    return Number.isNaN(new Date(t).getTime()) ? new Date().toISOString() : t;
}
function makeStatus(provider, health, detail, latencyMs) {
    return {
        provider,
        health,
        detail,
        latencyMs,
        lastCheckedAt: new Date().toISOString(),
    };
}
async function fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    }
    finally {
        clearTimeout(timer);
    }
}
async function mapWithConcurrency(items, concurrency, mapper) {
    const limit = Math.max(1, Math.floor(concurrency));
    const results = new Array(items.length);
    let next = 0;
    async function runWorker() {
        while (next < items.length) {
            const index = next++;
            results[index] = await mapper(items[index], index);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()));
    return results;
}
class FinnhubNewsProvider {
    key = 'finnhub';
    isConfigured() {
        return Boolean(getProviderEnv().FINNHUB_API_KEY);
    }
    async fetchNews(input) {
        const apiKey = getProviderEnv().FINNHUB_API_KEY;
        if (!apiKey) {
            return { items: [], providerStatus: makeStatus('finnhub', 'disabled', 'Missing FINNHUB_API_KEY.', null) };
        }
        const t0 = Date.now();
        try {
            const bySymbol = await mapWithConcurrency(input.symbols, DEFAULT_SYMBOL_CONCURRENCY, async (symbol) => {
                const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${input.fromIso.slice(0, 10)}&to=${input.toIso.slice(0, 10)}&token=${encodeURIComponent(apiKey)}`;
                const payload = await fetchJson(url, input.timeoutMs ?? DEFAULT_NEWS_TIMEOUT_MS);
                return payload.slice(0, input.maxItemsPerSymbol ?? 5).map((item, index) => ({
                    id: `finnhub:${symbol}:${String(item.id ?? index)}`,
                    symbol,
                    title: String(item.headline ?? 'Untitled'),
                    summary: String(item.summary ?? ''),
                    url: String(item.url ?? ''),
                    source: String(item.source ?? 'Finnhub'),
                    publishedAt: typeof item.datetime === 'number' ? new Date(item.datetime * 1000).toISOString() : toIso(item.datetime),
                    provider: 'finnhub',
                    language: String(item.lang ?? 'en'),
                    sentimentScore: undefined,
                    relevanceScore: undefined,
                    impactScore: undefined,
                    categories: [],
                    tickers: [symbol],
                    raw: item,
                }));
            });
            return {
                items: bySymbol.flat().filter((item) => item.url.startsWith('http')),
                providerStatus: makeStatus('finnhub', 'healthy', 'News feed reachable.', Date.now() - t0),
            };
        }
        catch (error) {
            return {
                items: [],
                providerStatus: makeStatus('finnhub', 'degraded', error instanceof Error ? error.message : 'News provider error', Date.now() - t0),
            };
        }
    }
}
class PolygonNewsProvider {
    key = 'polygon';
    isConfigured() {
        return Boolean(getProviderEnv().POLYGON_API_KEY);
    }
    async fetchNews(input) {
        const apiKey = getProviderEnv().POLYGON_API_KEY;
        if (!apiKey) {
            return { items: [], providerStatus: makeStatus('polygon', 'disabled', 'Missing POLYGON_API_KEY.', null) };
        }
        const t0 = Date.now();
        try {
            const tickerQuery = input.symbols.map((symbol) => `ticker=${encodeURIComponent(symbol.replace('BINANCE:', ''))}`).join('&');
            const url = `https://api.polygon.io/v2/reference/news?${tickerQuery}&limit=${Math.max(10, (input.maxItemsPerSymbol ?? 5) * input.symbols.length)}&order=desc&sort=published_utc&apiKey=${encodeURIComponent(apiKey)}`;
            const payload = await fetchJson(url, input.timeoutMs ?? DEFAULT_NEWS_TIMEOUT_MS);
            const items = (payload.results ?? []).map((item, index) => {
                const tickers = Array.isArray(item.tickers) ? item.tickers.map((t) => String(t)) : [];
                const symbol = tickers[0] ?? input.symbols[0] ?? 'UNKNOWN';
                return {
                    id: `polygon:${String(item.id ?? index)}`,
                    symbol,
                    title: String(item.title ?? 'Untitled'),
                    summary: String(item.description ?? ''),
                    url: String(item.article_url ?? ''),
                    source: String(item.publisher && typeof item.publisher === 'object' && 'name' in item.publisher ? item.publisher.name : 'Polygon'),
                    publishedAt: toIso(item.published_utc),
                    provider: 'polygon',
                    language: String(item.language ?? 'en'),
                    sentimentScore: undefined,
                    relevanceScore: undefined,
                    impactScore: undefined,
                    categories: Array.isArray(item.keywords) ? item.keywords.map((k) => String(k)) : [],
                    tickers,
                    raw: item,
                };
            });
            return {
                items: items.filter((item) => item.url.startsWith('http')),
                providerStatus: makeStatus('polygon', 'healthy', 'News feed reachable.', Date.now() - t0),
            };
        }
        catch (error) {
            return {
                items: [],
                providerStatus: makeStatus('polygon', 'degraded', error instanceof Error ? error.message : 'News provider error', Date.now() - t0),
            };
        }
    }
}
class MockNewsProvider {
    key = 'mock';
    isConfigured() {
        return true;
    }
    async fetchNews(input) {
        const now = new Date().toISOString();
        const items = input.symbols.slice(0, 6).map((symbol, index) => ({
            id: `mock:${symbol}:${index}`,
            symbol,
            title: `${symbol} local fallback news snapshot`,
            summary: 'Live news providers are unavailable. This is local fallback context.',
            url: `https://example.com/news/${encodeURIComponent(symbol)}`,
            source: 'Aurox local fallback',
            publishedAt: now,
            provider: 'mock',
            language: 'en',
            sentimentScore: 0,
            relevanceScore: 0.3,
            impactScore: 0.2,
            categories: ['fallback'],
            tickers: [symbol],
        }));
        return {
            items,
            providerStatus: makeStatus('mock', 'healthy', 'Fallback provider active.', 0),
        };
    }
}
function dedupeNews(items) {
    const byKey = new Map();
    for (const item of items) {
        const key = `${item.url.toLowerCase()}|${item.title.toLowerCase()}`;
        if (!byKey.has(key)) {
            byKey.set(key, item);
        }
    }
    return [...byKey.values()].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}
export async function fetchNewsStream(input) {
    const normalizedSymbols = [...new Set(input.symbols.map(normalizeSymbol).filter(Boolean))];
    if (normalizedSymbols.length === 0) {
        return { items: [], providerHealth: [], updatedAt: new Date().toISOString(), degraded: true, message: 'No symbols available.' };
    }
    const providers = [new FinnhubNewsProvider(), new PolygonNewsProvider()];
    const active = providers.filter((provider) => provider.isConfigured());
    const runner = active.length > 0 ? active : [new MockNewsProvider()];
    const results = await Promise.all(runner.map((provider) => provider.fetchNews({ ...input, symbols: normalizedSymbols })));
    const items = dedupeNews(results.flatMap((result) => result.items));
    const providerHealth = results.map((result) => result.providerStatus);
    const degraded = providerHealth.some((status) => status.health === 'degraded' || status.health === 'unavailable') || items.length === 0;
    return {
        items,
        providerHealth,
        updatedAt: new Date().toISOString(),
        degraded,
        ...(degraded ? { message: 'News stream is partially degraded; fallback data may be shown.' } : {}),
    };
}
