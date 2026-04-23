import type { InvestOverview, Locale } from '@repo/api-contracts';
import { deriveInvestmentRecommendation, deriveMarketInsight } from '@repo/ai-market-intelligence';
import type { InvestReadModel } from '../queries/invest-query';
import { getFreshnessState, getLatestTimestamp } from '../lib/market-data';
import { mapOptionalTimestamp, mapRouteStatusLabel, mapRouteStatusTone } from './route-presentation';
import { getMessages, type AppMessages } from '../../lib/i18n/messages';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice } from '../lib/quote-display';

export type InvestOverviewViewModel = InvestOverview & {
  statusLabel: string;
  statusTone: ReturnType<typeof mapRouteStatusTone>;
  lastUpdatedLabel: string;
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
  const lastUpdatedAt = getLatestTimestamp(readModel.observations);
  const freshnessState = getFreshnessState(lastUpdatedAt);
  const items = readModel.assets.map((asset) => {
    const observation = readModel.observations.find((item) => item.symbol === asset.symbol);
    const insight = deriveMarketInsight({
      assetId: asset.assetId,
      symbol: asset.symbol,
      price: observation?.price ?? null,
      changePercent: observation?.changePercent ?? null,
      forecastBias: null,
      freshnessState: getFreshnessState(observation?.timestamp),
      sourceSummary: readModel.providerError ? 'partial provider coverage' : `${readModel.provider.toUpperCase()} quote context`,
    });

    return {
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
      freshnessState: getFreshnessState(observation?.timestamp),
      lastUpdatedAt: observation?.timestamp ?? null,
      actionAvailability: asset.actionAvailability,
      isSimulated: asset.isSimulated,
      riskSummary: asset.riskSummary,
      insightStance: insight.stance,
    };
  });
  const recommendations = items
    .map((asset) =>
      deriveInvestmentRecommendation({
        assetId: asset.assetId,
        assetName: asset.name,
        symbol: asset.symbol,
        price: asset.price,
        changePercent: asset.changePercent,
        forecastBias: null,
        freshnessState: asset.freshnessState,
        sourceSummary: readModel.providerError ? 'partial provider coverage' : `${readModel.provider.toUpperCase()} quote context`,
        actionAvailability: asset.actionAvailability,
        riskSummary: asset.riskSummary,
      }),
    )
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4);

  return {
    title: 'Investment workspace',
    description:
      'User-facing discovery and planning surface for stocks, ETFs, and crypto with honest action availability, explainable AI recommendations, and bank-connection readiness.',
    status: items.length > 0 ? 'nominal' : 'attention',
    freshnessState,
    lastUpdatedAt,
    actionSummary:
      'Current actions support watchlists, scenario planning, and guarded simulation trading across stocks, ETFs, and crypto while live broker execution remains explicitly gated.',
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

export function mapInvestOverviewViewModel(
  snapshot: InvestOverview,
  locale: Locale = 'en',
  messages: AppMessages = getMessages(locale),
): InvestOverviewViewModel {
  return {
    ...snapshot,
    statusLabel: mapRouteStatusLabel(snapshot.status, messages.status),
    statusTone: mapRouteStatusTone(snapshot.status),
    lastUpdatedLabel: mapOptionalTimestamp(snapshot.lastUpdatedAt, locale, messages).absolute,
    featuredAssets: snapshot.featuredAssets.map((item) => ({
      ...item,
      priceLabel: formatUsdPrice(item.price, locale, messages.common.unavailable),
      changeLabel: formatPercentChange(item.changePercent, messages.common.partial),
      freshnessLabel: formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable),
    })),
    groupedAssets: snapshot.groupedAssets.map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        priceLabel: formatUsdPrice(item.price, locale, messages.common.unavailable),
        changeLabel: formatPercentChange(item.changePercent, messages.common.partial),
        freshnessLabel: formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable),
      })),
    })),
  };
}
