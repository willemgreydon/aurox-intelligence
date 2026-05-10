import type { InvestOverview, Locale } from '@repo/api-contracts';
import {
  deriveInvestmentRecommendation,
  deriveMarketInsight,
  rankAssets,
  deriveNewsImpactExplanation,
  type AssetRankingInput,
} from '@repo/ai-market-intelligence';
import { getClaudeFinanceProviderAvailability } from '@repo/providers';
import type { InvestReadModel } from '../queries/invest-query';
import { getFreshnessState, getLatestTimestamp } from '../lib/market-data';
import { mapOptionalTimestamp, mapRouteStatusLabel, mapRouteStatusTone } from './route-presentation';
import { getMessages, type AppMessages } from '../../lib/i18n/messages';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice } from '../lib/quote-display';
import { deriveAssetDecisionIntelligence, type AssetDecisionIntelligence } from '../services/decision-intelligence-service';
import { deriveMiniIndicatorChartModel } from '../lib/mini-indicator-model';
import type { MiniIndicatorChartModel } from '../../lib/charts/mini-indicator-model';
import { perfLog, perfNow } from '../lib/perf';

export type DataHealthViewModel = {
  provider: string;
  providerError: string | null;
  symbolsLoaded: number;
  symbolsTotal: number;
  freshnessLabel: string;
  freshnessTone: 'success' | 'warning' | 'info';
};

export type InvestOverviewViewModel = InvestOverview & {
  statusLabel: string;
  statusTone: ReturnType<typeof mapRouteStatusTone>;
  lastUpdatedLabel: string;
  sparklineBySymbol: Record<string, number[]>;
  dataHealth: DataHealthViewModel;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  decisionBySymbol: Record<string, AssetDecisionIntelligence>;
  miniChartModelBySymbol: Record<string, MiniIndicatorChartModel>;
  featuredAssets: Array<
    InvestOverview['featuredAssets'][number] & {
      priceLabel: string;
      changeLabel: string;
      freshnessLabel: string;
    }
  >;
  groupedAssets: Array<
    InvestOverview['groupedAssets'][number] & {
      items: Array<
        InvestOverview['groupedAssets'][number]['items'][number] & {
          priceLabel: string;
          changeLabel: string;
          freshnessLabel: string;
        }
      >;
    }
  >;
};

export function mapInvestOverview(readModel: InvestReadModel): InvestOverview {
  const t0 = perfNow();
  const lastUpdatedAt = getLatestTimestamp(readModel.observations);
  const freshnessState = getFreshnessState(lastUpdatedAt);
  const sourceSummary = readModel.providerError
    ? 'partial provider coverage'
    : `${readModel.provider.toUpperCase()} quote context`;
  const observationBySymbol = new Map(readModel.observations.map((item) => [item.symbol, item]));

  const enriched = readModel.assets.map((asset) => {
    const observation = observationBySymbol.get(asset.symbol);
    const assetFreshness = getFreshnessState(observation?.timestamp, asset.assetClass);
    const insight = deriveMarketInsight({
      assetId: asset.assetId,
      symbol: asset.symbol,
      price: observation?.price ?? null,
      changePercent: observation?.changePercent ?? null,
      forecastBias: null,
      freshnessState: assetFreshness,
      sourceSummary,
    });
    return { asset, observation, insight, assetFreshness };
  });

  const items = enriched.map(({ asset, observation, insight, assetFreshness }) => ({
    assetId: asset.assetId,
    symbol: asset.symbol,
    name: asset.name,
    assetClass: asset.assetClass,
    category: asset.category,
    geography: asset.geography,
    sector: asset.sector,
    thesis: asset.thesis,
    price: observation?.price ?? null,
    changePercent: observation?.changePercent ?? null,
    freshnessState: assetFreshness,
    lastUpdatedAt: observation?.timestamp ?? null,
    actionAvailability: asset.actionAvailability,
    isSimulated: asset.isSimulated,
    riskSummary: asset.riskSummary,
    insightStance: insight.stance,
  }));

  const recommendations = enriched
    .map(({ asset, observation, insight, assetFreshness }) => {
      const newsImpact = deriveNewsImpactExplanation(asset.symbol, readModel.newsStream.items);
      const recommendation = deriveInvestmentRecommendation({
        assetId: asset.assetId,
        assetName: asset.name,
        symbol: asset.symbol,
        price: observation?.price ?? null,
        changePercent: observation?.changePercent ?? null,
        forecastBias: null,
        freshnessState: assetFreshness,
        sourceSummary,
        actionAvailability: asset.actionAvailability,
        riskSummary:
          newsImpact.riskFlag === 'HIGH' || newsImpact.riskFlag === 'CRITICAL'
            ? `${asset.riskSummary} News risk detected. Execution requires manual review.`
            : asset.riskSummary,
      });
      return {
        ...recommendation,
        newsImpactScore: newsImpact.score,
        newsRiskFlag: newsImpact.riskFlag,
        executionReviewRequired: newsImpact.riskFlag === 'HIGH' || newsImpact.riskFlag === 'CRITICAL',
        reasons: [
          ...recommendation.reasons,
          `News impact score ${(newsImpact.score * 100).toFixed(0)}% (${newsImpact.riskFlag}).`,
        ],
      };
    })
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4);

  const rankingInputs: AssetRankingInput[] = enriched.map(({ asset, observation, insight, assetFreshness }) => ({
    assetId: asset.assetId,
    symbol: asset.symbol,
    assetKind: asset.assetClass,
    changePercent: observation?.changePercent ?? null,
    historyCloses: readModel.historySeriesBySymbol[asset.symbol] ?? [],
    freshnessState: assetFreshness,
    insightStance: insight.stance,
    insightConfidence: insight.confidence,
  }));
  const rankedAssets = rankAssets(rankingInputs);
  const claudeAvailability = getClaudeFinanceProviderAvailability();
  perfLog('invest-mapper:overview-core', t0);

  return {
    title: 'Investment workspace',
    description:
      'User-facing discovery and planning surface for stocks, ETFs, and crypto with honest action availability, explainable AI recommendations, and bank-connection readiness.',
    status: items.length > 0 ? 'nominal' : 'attention',
    freshnessState,
    lastUpdatedAt,
    actionSummary: claudeAvailability.configured
      ? 'Current actions support watchlists, scenario planning, guarded simulation trading, and optional Claude Finance advisory analysis.'
      : 'Current actions support watchlists, scenario planning, and guarded simulation trading across stocks, ETFs, and crypto while live broker execution remains explicitly gated. Claude Finance advisory provider is degraded or unavailable.',
    capabilities: [
      {
        assetClass: 'stock',
        title: 'Stock allocation planning',
        description: 'Research equities, compare moves, and simulate guarded buy or sell flows without live market execution.',
        actionAvailability: 'simulated',
        isSimulated: true,
        supportedActions: ['Add to watchlist', 'Simulate order', 'Open detail workspace'],
        disclosure: 'Simulation execution is enabled. Live execution remains gated by broker readiness, permissions, and policy controls.',
      },
      {
        assetClass: 'etf',
        title: 'ETF benchmark comparison',
        description: 'Use ETFs as broad market anchors for allocation, hedging, and simulation workflows.',
        actionAvailability: 'simulated',
        isSimulated: true,
        supportedActions: ['Compare benchmarks', 'Track benchmark drift', 'Simulate order'],
        disclosure: 'ETF simulation is enabled. Future live execution still requires broker/product mapping and explicit readiness gates.',
      },
      {
        assetClass: 'crypto',
        title: 'Crypto readiness lane',
        description: 'Track major digital assets with explicit, policy-aware simulation execution and a guarded path toward later live connectivity.',
        actionAvailability: 'simulated',
        isSimulated: true,
        supportedActions: ['Watch market structure', 'Simulate order', 'Compare to equity beta'],
        disclosure: 'Crypto simulation is enabled. Live exchange execution stays disabled until connectivity, permissions, and policy controls are explicitly satisfied.',
      },
    ],
    recommendations,
    rankedAssets,
    bankConnections: readModel.bankConnections,
    linkedAccounts: readModel.linkedAccounts,
    featuredAssets: items.slice(0, 4),
    groupedAssets: [
      { assetClass: 'stock', label: 'Stocks', items: items.filter((item) => item.assetClass === 'stock') },
      { assetClass: 'etf', label: 'ETFs', items: items.filter((item) => item.assetClass === 'etf') },
      { assetClass: 'crypto', label: 'Crypto', items: items.filter((item) => item.assetClass === 'crypto') },
    ],
    emptyStateMessage: items.length > 0 ? null : 'No investable assets are currently available.',
  };
}

function mapFreshnessLabel(state: InvestOverview['freshnessState']): string {
  switch (state) {
    case 'live': return 'Fresh';
    case 'delayed': return 'Delayed';
    case 'cached': return 'Cached';
    case 'market_closed': return 'Market closed';
    case 'stale': return 'Stale';
    case 'partial': return 'Partial';
    case 'unavailable': default: return 'Unavailable';
  }
}

function mapFreshnessTone(state: InvestOverview['freshnessState']): DataHealthViewModel['freshnessTone'] {
  if (state === 'live') return 'success';
  if (state === 'delayed' || state === 'stale') return 'warning';
  if (state === 'cached' || state === 'market_closed') return 'info';
  return 'info';
}

export function mapInvestOverviewViewModel(
  snapshot: InvestOverview,
  locale: Locale = 'en',
  messages: AppMessages = getMessages(locale),
  historySeriesBySymbol: Record<string, number[]> = {},
  provider: string = 'cache',
  providerError: string | null = null,
  symbolsLoaded: number = 0,
  symbolsTotal: number = 0,
  page: number = 1,
  pageSize: number = 1,
  totalItems: number = 0,
  hasNextPage: boolean = false,
  hasPreviousPage: boolean = false,
): InvestOverviewViewModel {
  const t0 = perfNow();
  const sparklineBySymbol: Record<string, number[]> = {};
  for (const [symbol, series] of Object.entries(historySeriesBySymbol)) {
    sparklineBySymbol[symbol] = series.slice(-24);
  }

  const dataHealth: DataHealthViewModel = {
    provider,
    providerError,
    symbolsLoaded,
    symbolsTotal,
    freshnessLabel: mapFreshnessLabel(snapshot.freshnessState),
    freshnessTone: mapFreshnessTone(snapshot.freshnessState),
  };

  const decisionBySymbol: Record<string, AssetDecisionIntelligence> = {};
  const miniChartModelBySymbol: Record<string, MiniIndicatorChartModel> = {};
  for (const group of snapshot.groupedAssets) {
    for (const item of group.items) {
      decisionBySymbol[item.symbol] = deriveAssetDecisionIntelligence({
        symbol: item.symbol,
        assetClass: item.assetClass,
        history: historySeriesBySymbol[item.symbol] ?? [],
        latestPrice: item.price,
        dayMovePercent: item.changePercent,
      });
      miniChartModelBySymbol[item.symbol] = deriveMiniIndicatorChartModel(
        historySeriesBySymbol[item.symbol] ?? [],
        decisionBySymbol[item.symbol]?.signal.score,
      );
    }
  }
  perfLog('invest-mapper:decision+charts', t0);

  return {
    ...snapshot,
    statusLabel: mapRouteStatusLabel(snapshot.status, messages.status),
    statusTone: mapRouteStatusTone(snapshot.status),
    lastUpdatedLabel: mapOptionalTimestamp(snapshot.lastUpdatedAt, locale, messages).absolute,
    sparklineBySymbol,
    dataHealth,
    pagination: {
      page: Math.max(1, page),
      pageSize: Math.max(1, pageSize),
      totalItems: Math.max(0, totalItems),
      hasNextPage,
      hasPreviousPage,
    },
    decisionBySymbol,
    miniChartModelBySymbol,
    featuredAssets: snapshot.featuredAssets.map((item) => ({
      ...item,
      priceLabel: formatUsdPrice(item.price, locale, messages.common.unavailable),
      changeLabel: formatPercentChange(item.changePercent, messages.common.partial),
      freshnessLabel: formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable, item.assetClass),
    })),
    groupedAssets: snapshot.groupedAssets.map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        priceLabel: formatUsdPrice(item.price, locale, messages.common.unavailable),
        changeLabel: formatPercentChange(item.changePercent, messages.common.partial),
        freshnessLabel: formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable, item.assetClass),
      })),
    })),
  };
}
