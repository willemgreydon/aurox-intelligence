import type { WatchlistIntelligenceItem } from '../services/market-observation-service';

export type WatchlistSort =
  | 'strongest_signal'
  | 'highest_confidence'
  | 'highest_risk'
  | 'biggest_mover'
  | 'newest_news'
  | 'worst_provider_freshness';

export type WatchlistFilter = {
  assetClass: 'all' | 'stock' | 'etf' | 'crypto' | 'other';
  signalAction: 'all' | 'BUY' | 'SELL' | 'HOLD';
  risk: 'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  news: 'all' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE';
  search: string;
};

function parsePercentLike(label: string): number {
  const normalized = label.replace('%', '').replace('+', '').trim();
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function freshnessRank(label: string): number {
  if (label.includes('stale')) return 1000;
  return 1;
}

function riskLevel(score: number | null): WatchlistFilter['risk'] {
  if (score === null) return 'MEDIUM';
  if (score >= 75) return 'EXTREME';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function newsBand(sentiment: number | null): WatchlistFilter['news'] {
  if (sentiment === null) return 'NEUTRAL';
  if (sentiment > 0.2) return 'POSITIVE';
  if (sentiment < -0.2) return 'NEGATIVE';
  return 'NEUTRAL';
}

export function sortAndFilterWatchlist(
  items: WatchlistIntelligenceItem[],
  sortBy: WatchlistSort,
  filter: WatchlistFilter,
): WatchlistIntelligenceItem[] {
  const filtered = items.filter((item) => {
    if (filter.assetClass !== 'all' && item.assetClass !== filter.assetClass) return false;
    if (filter.signalAction !== 'all' && item.signalAction !== filter.signalAction) return false;
    if (filter.risk !== 'all' && riskLevel(item.riskScore) !== filter.risk) return false;
    if (filter.news !== 'all' && newsBand(item.newsSentiment) !== filter.news) return false;
    if (filter.search.trim().length > 0) {
      const q = filter.search.trim().toUpperCase();
      if (!item.symbol.toUpperCase().includes(q) && !item.name.toUpperCase().includes(q)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'highest_confidence') return (b.confidence ?? -1) - (a.confidence ?? -1);
    if (sortBy === 'highest_risk') return (b.riskScore ?? -1) - (a.riskScore ?? -1);
    if (sortBy === 'biggest_mover') return Math.abs(parsePercentLike(b.changeLabel)) - Math.abs(parsePercentLike(a.changeLabel));
    if (sortBy === 'newest_news') return (b.newsSentiment ?? -2) - (a.newsSentiment ?? -2);
    if (sortBy === 'worst_provider_freshness') return freshnessRank(b.freshnessLabel) - freshnessRank(a.freshnessLabel);
    return (b.confidence ?? -1) - (a.confidence ?? -1);
  });
}
