import { getInvestmentUniverse, getUserDashboardPreset, getUserWatchlist, getSimulationWorkspace, listCatalogAssets } from '@repo/db';
import {
  fetchNewsStream,
  getHistoryPrioritySymbols,
  getLiveCandidateSymbols,
  getMarketSymbols,
  getSimulationSymbols,
} from '@repo/providers';
import type { NewsItem, NewsStreamResponse } from '@repo/api-contracts';
import { getOptionalCurrentSession } from '../auth/session';
import { withDbReadFallback } from '../lib/db-runtime';
import {
  getDefaultNewsSources,
  getMarketNewsCacheTtlSeconds,
  getMarketNewsItemsPerSource,
  getMarketNewsMode,
} from '../news/news-source-config';

const DEFAULT_NEWS_READ_TIMEOUT_MS = 3_000;

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function getReadTimeoutMs() {
  const value = Number(process.env.NEWS_READ_TIMEOUT_MS ?? DEFAULT_NEWS_READ_TIMEOUT_MS);
  if (!Number.isFinite(value) || value < 500) {
    return DEFAULT_NEWS_READ_TIMEOUT_MS;
  }
  return Math.floor(value);
}

function fallbackNews(): NewsStreamResponse {
  return {
    items: [],
    providerHealth: [],
    updatedAt: new Date().toISOString(),
    degraded: true,
    message: 'Database unavailable - showing local fallback data.',
  };
}

function dedupeAndSort(items: NewsItem[]) {
  const byKey = new Map<string, NewsItem>();
  for (const item of items) {
    const key = `${item.url.toLowerCase()}|${item.title.toLowerCase()}`;
    if (!byKey.has(key)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function parseRssItems(xml: string): Array<{
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
}> {
  const results: Array<{ title: string; url: string; summary: string; publishedAt: string }> = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of itemMatches) {
    const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const url = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const summary = (
      block.match(/<description>([\s\S]*?)<\/description>/i)?.[1]
      ?? block.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)?.[1]
      ?? ''
    ).replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').trim();
    const pubRaw = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '').trim();
    const publishedAt = pubRaw ? new Date(pubRaw).toISOString() : new Date().toISOString();
    if (url.startsWith('http')) {
      results.push({ title: title || 'Untitled', url, summary, publishedAt });
    }
  }
  return results;
}

async function fetchRssNews(): Promise<NewsStreamResponse> {
  const ttlSeconds = getMarketNewsCacheTtlSeconds();
  const perSource = getMarketNewsItemsPerSource();
  const sources = getDefaultNewsSources().filter((source) => source.enabled);

  const providerHealth: NewsStreamResponse['providerHealth'] = [];
  const items: NewsItem[] = [];

  await Promise.all(sources.map(async (source) => {
    const started = Date.now();
    try {
      const response = await fetch(source.feedUrl, {
        next: { revalidate: ttlSeconds },
        headers: { Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const xml = await response.text();
      const parsed = parseRssItems(xml).slice(0, perSource);
      for (const entry of parsed) {
        const stableId = encodeURIComponent(entry.url).slice(-28);
        items.push({
          id: `rss:${source.id}:${stableId}`,
          symbol: source.category === 'crypto' ? 'CRYPTO' : 'MARKET',
          title: entry.title,
          summary: entry.summary || '',
          url: entry.url,
          source: source.label,
          publishedAt: entry.publishedAt,
          provider: 'rss',
          language: 'en',
          categories: [source.category],
          tickers: [],
        });
      }
      providerHealth.push({
        provider: `rss:${source.label}`,
        health: parsed.length > 0 ? 'healthy' : 'degraded',
        detail: parsed.length > 0 ? 'RSS feed reachable.' : 'RSS feed returned no items.',
        latencyMs: Date.now() - started,
        lastCheckedAt: new Date().toISOString(),
      });
    } catch (error) {
      providerHealth.push({
        provider: `rss:${source.label}`,
        health: 'degraded',
        detail: error instanceof Error ? error.message : 'RSS feed unavailable.',
        latencyMs: Date.now() - started,
        lastCheckedAt: new Date().toISOString(),
      });
    }
  }));

  const deduped = dedupeAndSort(items);
  const degraded = deduped.length === 0 || providerHealth.some((status) => status.health !== 'healthy');
  return {
    items: deduped,
    providerHealth,
    updatedAt: new Date().toISOString(),
    degraded,
    ...(degraded ? { message: 'RSS market news is partially degraded; fallback data may be shown.' } : {}),
  };
}

async function loadUniverseSymbols() {
  const session = await getOptionalCurrentSession();
  const [investmentUniverse, catalogAssets, watchlist, workspace, preset] = await Promise.all([
    withDbReadFallback('news:investment-universe', [], () => getInvestmentUniverse()),
    withDbReadFallback('news:catalog-assets', [], () => listCatalogAssets()),
    session ? withDbReadFallback('news:watchlist', [], () => getUserWatchlist(session.user.id)) : Promise.resolve({ value: [], degraded: false, reason: null }),
    session ? withDbReadFallback('news:simulation-workspace', null, () => getSimulationWorkspace(session.user.id)) : Promise.resolve({ value: null, degraded: false, reason: null }),
    session ? withDbReadFallback('news:dashboard-preset', null, () => getUserDashboardPreset(session.user.id)) : Promise.resolve({ value: null, degraded: false, reason: null }),
  ]);

  const symbols = new Set<string>();
  for (const item of investmentUniverse.value) symbols.add(normalizeSymbol(item.symbol));
  for (const item of catalogAssets.value) symbols.add(normalizeSymbol(item.symbol));
  for (const item of watchlist.value) symbols.add(normalizeSymbol(item.symbol));
  for (const item of workspace.value?.positions ?? []) symbols.add(normalizeSymbol(item.symbol));
  for (const symbol of preset.value?.trackedSymbols ?? []) symbols.add(normalizeSymbol(symbol));
  for (const symbol of getMarketSymbols()) symbols.add(normalizeSymbol(symbol));
  for (const symbol of getSimulationSymbols()) symbols.add(normalizeSymbol(symbol));
  for (const symbol of getLiveCandidateSymbols()) symbols.add(normalizeSymbol(symbol));
  for (const symbol of getHistoryPrioritySymbols()) symbols.add(normalizeSymbol(symbol));

  return [...symbols].filter(Boolean);
}

export async function getNewsReadModel(): Promise<NewsStreamResponse> {
  const timeoutMs = getReadTimeoutMs();
  const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();
  const mode = getMarketNewsMode();

  try {
    if (mode === 'rss') {
      const rss = await Promise.race([
        fetchRssNews(),
        new Promise<NewsStreamResponse>((resolve) => setTimeout(() => resolve(fallbackNews()), timeoutMs)),
      ]);
      if (rss.items.length > 0) {
        return {
          ...rss,
          items: dedupeAndSort(rss.items),
        };
      }
      const symbols = await loadUniverseSymbols();
      const fallbackStream = await fetchNewsStream({
        symbols: symbols.slice(0, 40),
        fromIso: from,
        toIso: to,
        timeoutMs: Math.min(timeoutMs, 2_500),
        maxItemsPerSymbol: 3,
      });
      return {
        ...fallbackStream,
        items: dedupeAndSort(fallbackStream.items).slice(0, 120),
        message: fallbackStream.message ?? 'RSS feed unavailable; using provider fallback.',
      };
    }

    const symbols = await Promise.race([
      loadUniverseSymbols(),
      new Promise<string[]>((resolve) => setTimeout(() => resolve([]), timeoutMs)),
    ]);

    if (mode === 'mock') {
      return fetchNewsStream({
        symbols: symbols.slice(0, 12),
        fromIso: from,
        toIso: to,
        timeoutMs: Math.min(timeoutMs, 2_500),
        maxItemsPerSymbol: 1,
        forceMock: true,
      });
    }

    const stream = await Promise.race([
      fetchNewsStream({
        symbols: symbols.slice(0, 40),
        fromIso: from,
        toIso: to,
        timeoutMs: Math.min(timeoutMs, 2_500),
        maxItemsPerSymbol: 3,
      }),
      new Promise<NewsStreamResponse>((resolve) => setTimeout(() => resolve(fallbackNews()), timeoutMs)),
    ]);
    return {
      ...stream,
      items: dedupeAndSort(stream.items).slice(0, 120),
    };
  } catch {
    return fallbackNews();
  }
}
