import type { NewsItem } from '@repo/api-contracts';

export type NewsImpactTrace = {
  symbol: string;
  assetId?: string;
  sentimentAdjustment: number;
  confidenceAdjustment: number;
  riskAdjustment: number;
  explanation: string[];
  influencedByNewsIds: string[];
  computedAt: string;
};

export type NewsImpactInput = {
  assetId?: string;
  symbol: string;
  recentNews: NewsItem[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function recencyMultiplier(publishedAt: string): number {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (!Number.isFinite(ageHours) || ageHours < 0) return 0;
  if (ageHours <= 6) return 1;
  if (ageHours <= 24) return 0.75;
  if (ageHours <= 72) return 0.4;
  return 0.05;
}

export function computeNewsImpact(input: NewsImpactInput): NewsImpactTrace {
  const scoped = input.recentNews.filter((item) => {
    const extended = item as NewsItem & { symbols?: string[] };
    const symbols = (extended.symbols && extended.symbols.length > 0)
      ? extended.symbols
      : [item.symbol, ...item.tickers];
    return symbols.map((s) => s.toUpperCase()).includes(input.symbol.toUpperCase());
  });

  if (scoped.length === 0) {
    return {
      symbol: input.symbol,
      assetId: input.assetId,
      sentimentAdjustment: 0,
      confidenceAdjustment: 0,
      riskAdjustment: 0,
      explanation: ['No relevant recent news; deterministic signals remain primary.'],
      influencedByNewsIds: [],
      computedAt: new Date().toISOString(),
    };
  }

  let sentimentAggregate = 0;
  let relevanceAggregate = 0;
  const explanations: string[] = [];
  const influencedByNewsIds: string[] = [];

  for (const item of scoped) {
    const relevance = clamp(item.relevanceScore ?? 0.5, 0, 1);
    const sentiment = clamp(item.sentimentScore ?? 0, -1, 1);
    const recency = recencyMultiplier(item.publishedAt);
    const weight = relevance * recency;
    if (weight < 0.08) continue;
    sentimentAggregate += sentiment * weight;
    relevanceAggregate += weight;
    influencedByNewsIds.push(item.id);
    explanations.push(`${item.source}: ${item.title}`);
  }

  if (relevanceAggregate <= 0) {
    return {
      symbol: input.symbol,
      assetId: input.assetId,
      sentimentAdjustment: 0,
      confidenceAdjustment: 0,
      riskAdjustment: 0,
      explanation: ['Only stale or low-relevance news was found and ignored.'],
      influencedByNewsIds: [],
      computedAt: new Date().toISOString(),
    };
  }

  const avgSentiment = clamp(sentimentAggregate / relevanceAggregate, -1, 1);
  const sentimentAdjustment = clamp(avgSentiment * 0.2, -0.2, 0.2);
  const confidenceAdjustment = clamp(avgSentiment * 0.15, -0.15, 0.15);
  const riskAdjustment = clamp(avgSentiment < 0 ? Math.abs(avgSentiment) * 0.25 : -avgSentiment * 0.1, -0.2, 0.25);

  return {
    symbol: input.symbol,
    assetId: input.assetId,
    sentimentAdjustment,
    confidenceAdjustment,
    riskAdjustment,
    explanation: explanations.slice(0, 5),
    influencedByNewsIds,
    computedAt: new Date().toISOString(),
  };
}
