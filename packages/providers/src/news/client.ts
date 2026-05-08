import type { NewsItem, NewsProviderStatus, NewsStreamResponse } from '@repo/api-contracts';
import { getProviderEnv } from '../config';
import type { FetchNewsInput, FetchNewsOutput, NewsProvider } from './types';

const DEFAULT_NEWS_TIMEOUT_MS = 2_500;
const DEFAULT_SYMBOL_CONCURRENCY = 5;

function decodeHtmlEntities(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2018;/g, '‘')
    .replace(/&#x2019;/g, '’')
    .replace(/&#x201c;/gi, '“')
    .replace(/&#x201d;/gi, '”')
    .replace(/&#x2014;/g, '—')
    .replace(/&#x2013;/g, '–')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanNewsText(value: unknown, fallback: string): string {
  const base = typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  return decodeHtmlEntities(base).replace(/\s+/g, ' ').trim();
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function inferAssetClass(symbol: string): 'stock' | 'etf' | 'crypto' | 'macro' {
  if (symbol.includes('BINANCE:') || symbol.endsWith('USDT') || symbol.endsWith('-USD')) return 'crypto';
  if (symbol === 'MARKET' || symbol === 'CRYPTO') return 'macro';
  if (symbol === 'SPY' || symbol === 'QQQ' || symbol === 'VTI') return 'etf';
  return 'stock';
}

function isStaleNews(publishedAt: string): boolean {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  return Number.isFinite(ageMs) ? ageMs > 72 * 60 * 60 * 1000 : true;
}

function toIso(value: unknown) {
  if (typeof value !== 'string' || !value) {
    return new Date().toISOString();
  }
  const t = new Date(value).toISOString();
  return Number.isNaN(new Date(t).getTime()) ? new Date().toISOString() : t;
}

function makeStatus(provider: string, health: NewsProviderStatus['health'], detail: string, latencyMs: number | null): NewsProviderStatus {
  return {
    provider,
    health,
    detail,
    latencyMs,
    lastCheckedAt: new Date().toISOString(),
  };
}

async function fetchJson(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<TOutput>(items.length);
  let next = 0;

  async function runWorker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index]!, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()));
  return results;
}

class FinnhubNewsProvider implements NewsProvider {
  readonly key = 'finnhub' as const;
  isConfigured() {
    return Boolean(getProviderEnv().FINNHUB_API_KEY);
  }
  async fetchNews(input: FetchNewsInput): Promise<FetchNewsOutput> {
    const apiKey = getProviderEnv().FINNHUB_API_KEY;
    if (!apiKey) {
      return { items: [], providerStatus: makeStatus('finnhub', 'disabled', 'Missing FINNHUB_API_KEY.', null) };
    }
    const t0 = Date.now();
    try {
      const bySymbol = await mapWithConcurrency(input.symbols, DEFAULT_SYMBOL_CONCURRENCY, async (symbol) => {
        const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${input.fromIso.slice(0, 10)}&to=${input.toIso.slice(0, 10)}&token=${encodeURIComponent(apiKey)}`;
        const payload = await fetchJson(url, input.timeoutMs ?? DEFAULT_NEWS_TIMEOUT_MS) as Array<Record<string, unknown>>;
        return payload.slice(0, input.maxItemsPerSymbol ?? 5).map((item, index): NewsItem => ({
          id: `finnhub:${symbol}:${String(item.id ?? index)}`,
          symbol,
          symbols: [symbol],
          assetIds: [],
          assetClass: inferAssetClass(symbol),
          title: cleanNewsText(item.headline, 'Untitled'),
          summary: cleanNewsText(item.summary, ''),
          url: String(item.url ?? ''),
          source: cleanNewsText(item.source, 'Finnhub'),
          publishedAt: typeof item.datetime === 'number' ? new Date(item.datetime * 1000).toISOString() : toIso(item.datetime),
          provider: 'finnhub',
          language: String(item.lang ?? 'en'),
          sentimentScore: undefined,
          relevanceScore: undefined,
          impactScore: undefined,
          categories: [],
          tickers: [symbol],
          riskTags: [],
          extractedEntities: [],
          stale: isStaleNews(typeof item.datetime === 'number' ? new Date(item.datetime * 1000).toISOString() : toIso(item.datetime)),
          raw: item,
        } as NewsItem));
      });
      return {
        items: bySymbol.flat().filter((item) => item.url.startsWith('http')),
        providerStatus: makeStatus('finnhub', 'healthy', 'News feed reachable.', Date.now() - t0),
      };
    } catch (error) {
      return {
        items: [],
        providerStatus: makeStatus('finnhub', 'degraded', error instanceof Error ? error.message : 'News provider error', Date.now() - t0),
      };
    }
  }
}

class PolygonNewsProvider implements NewsProvider {
  readonly key = 'polygon' as const;
  isConfigured() {
    return Boolean(getProviderEnv().POLYGON_API_KEY);
  }
  async fetchNews(input: FetchNewsInput): Promise<FetchNewsOutput> {
    const apiKey = getProviderEnv().POLYGON_API_KEY;
    if (!apiKey) {
      return { items: [], providerStatus: makeStatus('polygon', 'disabled', 'Missing POLYGON_API_KEY.', null) };
    }
    const t0 = Date.now();
    try {
      const tickerQuery = input.symbols.map((symbol) => `ticker=${encodeURIComponent(symbol.replace('BINANCE:', ''))}`).join('&');
      const url = `https://api.polygon.io/v2/reference/news?${tickerQuery}&limit=${Math.max(10, (input.maxItemsPerSymbol ?? 5) * input.symbols.length)}&order=desc&sort=published_utc&apiKey=${encodeURIComponent(apiKey)}`;
      const payload = await fetchJson(url, input.timeoutMs ?? DEFAULT_NEWS_TIMEOUT_MS) as { results?: Array<Record<string, unknown>> };
      const items = (payload.results ?? []).map((item, index): NewsItem => {
        const tickers = Array.isArray(item.tickers) ? item.tickers.map((t) => String(t)) : [];
        const symbol = tickers[0] ?? input.symbols[0] ?? 'UNKNOWN';
        return {
          id: `polygon:${String(item.id ?? index)}`,
          symbol,
          symbols: tickers.length > 0 ? tickers : [symbol],
          assetIds: [],
          assetClass: inferAssetClass(symbol),
          title: cleanNewsText(item.title, 'Untitled'),
          summary: cleanNewsText(item.description, ''),
          url: String(item.article_url ?? ''),
          source: cleanNewsText(item.publisher && typeof item.publisher === 'object' && 'name' in item.publisher ? item.publisher.name : 'Polygon', 'Polygon'),
          publishedAt: toIso(item.published_utc),
          provider: 'polygon',
          language: String(item.language ?? 'en'),
          sentimentScore: undefined,
          relevanceScore: undefined,
          impactScore: undefined,
          categories: Array.isArray(item.keywords) ? item.keywords.map((k) => String(k)) : [],
          tickers,
          riskTags: [],
          extractedEntities: [],
          stale: isStaleNews(toIso(item.published_utc)),
          raw: item,
        } as NewsItem;
      });
      return {
        items: items.filter((item) => item.url.startsWith('http')),
        providerStatus: makeStatus('polygon', 'healthy', 'News feed reachable.', Date.now() - t0),
      };
    } catch (error) {
      return {
        items: [],
        providerStatus: makeStatus('polygon', 'degraded', error instanceof Error ? error.message : 'News provider error', Date.now() - t0),
      };
    }
  }
}

class MockNewsProvider implements NewsProvider {
  readonly key = 'mock' as const;
  isConfigured() {
    return true;
  }
  async fetchNews(input: FetchNewsInput): Promise<FetchNewsOutput> {
    const now = new Date().toISOString();
    const items = input.symbols.slice(0, 6).map((symbol, index): NewsItem => ({
      id: `mock:${symbol}:${index}`,
      symbol,
      symbols: [symbol],
      assetIds: [],
      assetClass: inferAssetClass(symbol),
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
      riskTags: ['FALLBACK'],
      extractedEntities: [symbol],
      stale: false,
    } as NewsItem));
    return {
      items,
      providerStatus: makeStatus('mock', 'healthy', 'Fallback provider active.', 0),
    };
  }
}

function dedupeNews(items: NewsItem[]): NewsItem[] {
  const byKey = new Map<string, NewsItem>();
  for (const item of items) {
    const key = `${item.url.toLowerCase()}|${item.title.toLowerCase()}|${item.symbol}`;
    if (!byKey.has(key)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function fetchNewsStream(input: FetchNewsInput): Promise<NewsStreamResponse> {
  const normalizedSymbols = [...new Set(input.symbols.map(normalizeSymbol).filter(Boolean))];
  if (normalizedSymbols.length === 0) {
    return { items: [], providerHealth: [], updatedAt: new Date().toISOString(), degraded: true, message: 'No symbols available.' };
  }

  const providers: NewsProvider[] = [new FinnhubNewsProvider(), new PolygonNewsProvider()];
  const active = providers.filter((provider) => provider.isConfigured());
  const runner = input.forceMock ? [new MockNewsProvider()] : (active.length > 0 ? active : [new MockNewsProvider()]);
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
