import type { NewsImpactExplanation, NewsItem, NewsRiskFlag } from '@repo/api-contracts';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function recencyWeight(publishedAt: string): number {
  const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60));
  if (ageHours <= 2) return 1;
  if (ageHours <= 12) return 0.8;
  if (ageHours <= 24) return 0.6;
  if (ageHours <= 72) return 0.35;
  return 0.15;
}

function sourceWeight(source: string): number {
  const normalized = source.toLowerCase();
  if (normalized.includes('reuters') || normalized.includes('bloomberg') || normalized.includes('wsj')) return 1;
  if (normalized.includes('finnhub') || normalized.includes('polygon')) return 0.75;
  return 0.5;
}

function computeItemImpact(item: NewsItem): number {
  const sentiment = clamp(item.sentimentScore ?? 0, -1, 1);
  const relevance = clamp(item.relevanceScore ?? 0.5, 0, 1);
  const recency = recencyWeight(item.publishedAt);
  const source = sourceWeight(item.source);
  const raw = sentiment * relevance * recency * source;
  return clamp(raw, -1, 1);
}

function toRiskFlag(score: number): NewsRiskFlag {
  if (score <= -0.55) return 'CRITICAL';
  if (score <= -0.35) return 'HIGH';
  if (score <= -0.12) return 'MEDIUM';
  return 'LOW';
}

export function deriveNewsImpactExplanation(symbol: string, news: NewsItem[]): NewsImpactExplanation {
  const scoped = news.filter((item) => item.symbol === symbol || item.tickers.includes(symbol));
  if (scoped.length === 0) {
    return {
      symbol,
      score: 0.5,
      riskFlag: 'LOW',
      keyDrivers: ['No recent news for symbol.'],
      positiveSignals: [],
      negativeSignals: [],
      uncertaintyNotes: ['No direct symbol headlines in current window.'],
      sourceCount: 0,
      latestPublishedAt: null,
    };
  }
  const impacts = scoped.map((item) => ({ item, impact: computeItemImpact(item) }));
  const aggregate = clamp(impacts.reduce((sum, row) => sum + row.impact, 0) / Math.max(impacts.length, 1), -1, 1);
  const normalizedScore = clamp((aggregate + 1) / 2, 0, 1);
  const positives = impacts.filter((row) => row.impact > 0.1).map((row) => row.item.title).slice(0, 3);
  const negatives = impacts.filter((row) => row.impact < -0.1).map((row) => row.item.title).slice(0, 3);
  return {
    symbol,
    score: normalizedScore,
    riskFlag: toRiskFlag(aggregate),
    keyDrivers: impacts.slice(0, 3).map((row) => `${row.item.source}: ${row.item.title}`),
    positiveSignals: positives,
    negativeSignals: negatives,
    uncertaintyNotes: ['News sentiment is heuristic and does not auto-trigger execution.'],
    sourceCount: new Set(scoped.map((item) => item.source)).size,
    latestPublishedAt: scoped.map((item) => item.publishedAt).sort().at(-1) ?? null,
  };
}
