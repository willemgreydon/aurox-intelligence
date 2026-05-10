export * from './portfolio/portfolio-intelligence-engine';
export * from './macro/regime-engine';
export {
  rankAssets,
  computeCompositeScore,
  computeRiskPenalty,
  mapRankingRecommendation,
  computeRankingConfidence,
} from './ranking-engine';
export { deriveNewsImpactExplanation } from './news/news-impact';
export { extractNewsIntelligenceSnapshot, buildContentHash } from './news/news-intelligence-extractor';
export { orchestrateSystemState } from './orchestration/system-orchestrator';
export type { SystemState, AssetState, AssetOrchestrationInput } from './orchestration/system-orchestrator';
export { computeRecommendation } from './recommendation/recommendation-engine';
export { buildRecommendationExplanation } from './recommendation/recommendation-explainer';
export type {
  Recommendation,
  RecommendationAction,
  RecommendationHorizon,
  RecommendationRiskLevel,
  EngineRecommendationInput,
} from './recommendation/recommendation-engine';
export type {
  AssetRankingInput,
  CompositeScoreComponents,
  RiskPenaltyFactors,
} from './ranking-engine';

import type {
  InvestmentRecommendation,
  MarketInsightSummary,
  MarketIntelligenceDigest,
  FreshnessState,
  RecommendationAction,
  SentimentState,
} from '@repo/api-contracts';

export type IntelligenceInput = {
  assetId: string;
  symbol: string;
  price: number | null;
  changePercent: number | null;
  forecastBias: 'bullish' | 'bearish' | 'neutral' | null;
  forecastConfidence?: number | null;
  freshnessState: FreshnessState;
  generatedAt?: string;
  sourceSummary: string;
  newsSignals?: string[];
};

export type RecommendationInput = IntelligenceInput & {
  assetName: string;
  actionAvailability: 'available' | 'simulated' | 'planned' | 'unavailable';
  riskSummary: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mapStance(changePercent: number | null, forecastBias: IntelligenceInput['forecastBias']): SentimentState {
  if ((changePercent ?? 0) > 0.35 || forecastBias === 'bullish') {
    return 'positive';
  }

  if ((changePercent ?? 0) < -0.35 || forecastBias === 'bearish') {
    return 'negative';
  }

  return 'neutral';
}

function buildConfidence(input: IntelligenceInput): number {
  const moveComponent = Math.min(Math.abs(input.changePercent ?? 0) / 5, 0.32);
  const freshnessComponent =
    input.freshnessState === 'live' ? 0.22 : input.freshnessState === 'delayed' ? 0.14 : input.freshnessState === 'partial' ? 0.08 : 0.04;
  const forecastComponent = input.forecastConfidence ?? (input.forecastBias ? 0.12 : 0.05);
  return clamp(0.32 + moveComponent + freshnessComponent + forecastComponent, 0.28, 0.89);
}

function formatMove(changePercent: number | null): string {
  if (changePercent === null) {
    return 'move unavailable';
  }

  return `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
}

export function deriveMarketInsight(input: IntelligenceInput): MarketInsightSummary {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const stance = mapStance(input.changePercent, input.forecastBias);
  const confidence = buildConfidence(input);
  const changeLabel = formatMove(input.changePercent);
  const whatChanged =
    input.changePercent === null
      ? `${input.symbol} is currently missing a complete move calculation, so the interpretation remains partial.`
      : `${input.symbol} is trading ${changeLabel} on the latest observed snapshot.`;

  return {
    assetId: input.assetId,
    symbol: input.symbol,
    headline:
      stance === 'positive'
        ? `${input.symbol} retains constructive near-term market tone`
        : stance === 'negative'
          ? `${input.symbol} is trading with defensive pressure`
          : `${input.symbol} is in a mixed market posture`,
    summary:
      input.forecastBias && input.forecastBias !== 'neutral'
        ? `${whatChanged} Forecast alignment is currently ${input.forecastBias}, which is being treated as enrichment rather than certainty.`
        : `${whatChanged} The current read is driven mainly by observed market data with limited forecast overlap.`,
    stance,
    confidence,
    whatChanged,
    factors: [
      {
        key: 'price-action',
        label: 'Price action',
        value: changeLabel,
        impact: stance,
        confidence,
      },
      {
        key: 'forecast-alignment',
        label: 'Forecast alignment',
        value: input.forecastBias ?? 'unavailable',
        impact:
          input.forecastBias === 'bullish'
            ? 'positive'
            : input.forecastBias === 'bearish'
              ? 'negative'
              : 'neutral',
        confidence: clamp(input.forecastConfidence ?? 0.42, 0.2, 0.82),
      },
      {
        key: 'freshness',
        label: 'Data freshness',
        value: input.freshnessState,
        impact: input.freshnessState === 'stale' || input.freshnessState === 'unavailable' ? 'negative' : 'neutral',
        confidence: 0.9,
      },
    ],
    riskFlags: [
      {
        key: 'data-truthfulness',
        label: 'Truthfulness guardrail',
        severity: input.freshnessState === 'live' ? 'low' : input.freshnessState === 'partial' ? 'medium' : 'high',
        detail: `This interpretation is based on ${input.sourceSummary.toLowerCase()} and is not a claim of real-time or brokerage-grade execution data.`,
      },
      ...(input.newsSignals?.length
        ? []
        : [
            {
              key: 'news-coverage',
              label: 'News coverage',
              severity: 'medium' as const,
              detail: 'No structured news extraction is currently attached to this insight, so context remains quote-weighted.',
            },
          ]),
    ],
    provenance: {
      generatedAt,
      modelMode: 'heuristic',
      sourceSummary: input.sourceSummary,
      freshnessState: input.freshnessState,
      supportingSources: ['market-observation', ...(input.forecastBias ? ['forecast-preview'] : [])],
    },
  };
}

export function deriveMarketIntelligenceDigest(
  title: string,
  inputs: IntelligenceInput[],
  freshnessState: FreshnessState,
): MarketIntelligenceDigest {
  const assetInsights = inputs.map(deriveMarketInsight);
  const positives = assetInsights.filter((item) => item.stance === 'positive').length;
  const negatives = assetInsights.filter((item) => item.stance === 'negative').length;
  const neutrals = assetInsights.length - positives - negatives;

  return {
    title,
    status: inputs.length > 0 ? 'nominal' : 'attention',
    freshnessState,
    generatedAt: assetInsights[0]?.provenance.generatedAt ?? null,
    summary:
      assetInsights.length > 0
        ? `${positives} assets are constructive, ${negatives} are under pressure, and ${neutrals} remain mixed across the latest monitored set.`
        : 'No market intelligence outputs are currently available.',
    marketPulse:
      freshnessState === 'live'
        ? 'Latest provider observations are being converted into structured, explainable market context.'
        : 'Structured market context is available, but freshness should be treated carefully before acting.',
    assetInsights,
    emptyStateMessage: assetInsights.length > 0 ? null : 'No structured market intelligence outputs are available yet.',
  };
}

function mapRecommendationAction(input: RecommendationInput): RecommendationAction {
  if (input.freshnessState === 'stale' || input.freshnessState === 'unavailable') {
    return 'watch';
  }

  if ((input.changePercent ?? 0) >= 2.5 && input.forecastBias === 'bullish') {
    return 'accumulate';
  }

  if ((input.changePercent ?? 0) <= -2.5 && input.forecastBias === 'bearish') {
    return 'avoid';
  }

  if ((input.changePercent ?? 0) >= 1) {
    return 'hold';
  }

  if ((input.changePercent ?? 0) <= -1) {
    return 'watch';
  }

  return 'hold';
}

export function deriveInvestmentRecommendation(input: RecommendationInput): InvestmentRecommendation {
  const action = mapRecommendationAction(input);
  const confidence = buildConfidence(input);
  const suitability = confidence >= 0.72 ? 'high' : confidence >= 0.55 ? 'medium' : 'low';
  const insight = deriveMarketInsight(input);

  return {
    assetId: input.assetId,
    symbol: input.symbol,
    action,
    confidence,
    suitability,
    summary:
      action === 'accumulate'
        ? `${input.assetName} screens as a constructive candidate for further accumulation review, not as a guaranteed winner.`
        : action === 'avoid'
          ? `${input.assetName} is currently better treated as defensive or do-not-add exposure.`
          : action === 'watch'
            ? `${input.assetName} should stay on watch until freshness, trend, or context improve.`
            : action === 'trim'
              ? `${input.assetName} looks extended enough to review position sizing.`
              : `${input.assetName} fits a hold-and-monitor posture under the latest observed conditions.`,
    reasons: [
      insight.whatChanged,
      `AI confidence is ${(confidence * 100).toFixed(0)}% with ${suitability} suitability based on available market context.`,
      `Execution availability is ${input.actionAvailability}, so this recommendation is limited to planning or research when applicable.`,
    ],
    riskNotice: input.riskSummary,
    isPersonalized: false,
    newsImpactScore: 0.5,
    newsRiskFlag: 'LOW',
    executionReviewRequired: false,
  };
}
