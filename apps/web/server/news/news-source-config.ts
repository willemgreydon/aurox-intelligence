export type MarketNewsMode = 'rss' | 'api' | 'mock';

export type NewsSourceConfig = {
  id: string;
  label: string;
  feedUrl: string;
  category: 'market' | 'crypto' | 'business';
  enabled: boolean;
  requiresApiKey: boolean;
};

const DEFAULT_RSS_FEEDS = [
  'https://feeds.content.dowjones.io/public/rss/mw_topstories',
  'https://www.nasdaq.com/feed/rssoutbound',
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
];

export function getMarketNewsMode(): MarketNewsMode {
  const raw = (process.env.MARKET_NEWS_MODE ?? 'rss').trim().toLowerCase();
  if (raw === 'api' || raw === 'mock' || raw === 'rss') {
    return raw;
  }
  return 'rss';
}

export function getMarketNewsCacheTtlSeconds(): number {
  const raw = Number(process.env.MARKET_NEWS_CACHE_TTL_SECONDS ?? 900);
  if (!Number.isFinite(raw) || raw < 60) {
    return 900;
  }
  return Math.floor(raw);
}

export function getMarketNewsItemsPerSource(): number {
  const raw = Number(process.env.MARKET_NEWS_ITEMS_PER_SOURCE ?? 6);
  if (!Number.isFinite(raw) || raw < 1) {
    return 6;
  }
  return Math.min(12, Math.floor(raw));
}

export function getConfiguredRssFeeds(): string[] {
  const raw = (process.env.MARKET_NEWS_RSS_FEEDS ?? '').trim();
  const feeds = (raw ? raw.split(',') : DEFAULT_RSS_FEEDS)
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(feeds)];
}

function labelForFeed(url: string): string {
  const value = url.toLowerCase();
  if (value.includes('marketwatch') || value.includes('dowjones')) return 'MarketWatch';
  if (value.includes('nasdaq')) return 'Nasdaq';
  if (value.includes('coindesk')) return 'CoinDesk';
  if (value.includes('yahoo')) return 'Yahoo Finance';
  if (value.includes('cnbc')) return 'CNBC';
  if (value.includes('reuters')) return 'Reuters';
  if (value.includes('investopedia')) return 'Investopedia';
  return 'Market feed';
}

export function getDefaultNewsSources(): NewsSourceConfig[] {
  return getConfiguredRssFeeds().map((feedUrl, index) => ({
    id: `rss-${index + 1}`,
    label: labelForFeed(feedUrl),
    feedUrl,
    category: feedUrl.toLowerCase().includes('coindesk') ? 'crypto' : 'market',
    enabled: true,
    requiresApiKey: false,
  }));
}

