import { getInvestmentUniverse, getUserWatchlist, getSimulationWorkspace, listCatalogAssets } from '@repo/db';
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

async function loadUniverseSymbols() {
  const session = await getOptionalCurrentSession();
  const [investmentUniverse, catalogAssets, watchlist, workspace] = await Promise.all([
    withDbReadFallback('news:investment-universe', [], () => getInvestmentUniverse()),
    withDbReadFallback('news:catalog-assets', [], () => listCatalogAssets()),
    session ? withDbReadFallback('news:watchlist', [], () => getUserWatchlist(session.user.id)) : Promise.resolve({ value: [], degraded: false, reason: null }),
    session ? withDbReadFallback('news:simulation-workspace', null, () => getSimulationWorkspace(session.user.id)) : Promise.resolve({ value: null, degraded: false, reason: null }),
  ]);

  const symbols = new Set<string>();
  for (const item of investmentUniverse.value) symbols.add(normalizeSymbol(item.symbol));
  for (const item of catalogAssets.value) symbols.add(normalizeSymbol(item.symbol));
  for (const item of watchlist.value) symbols.add(normalizeSymbol(item.symbol));
  for (const item of workspace.value?.positions ?? []) symbols.add(normalizeSymbol(item.symbol));
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

  try {
    const symbols = await Promise.race([
      loadUniverseSymbols(),
      new Promise<string[]>((resolve) => setTimeout(() => resolve([]), timeoutMs)),
    ]);
    const stream = await Promise.race([
      fetchNewsStream({ symbols: symbols.slice(0, 40), fromIso: from, toIso: to, timeoutMs: Math.min(timeoutMs, 2_500), maxItemsPerSymbol: 3 }),
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
