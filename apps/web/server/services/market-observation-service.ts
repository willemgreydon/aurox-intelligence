import { getMarketIntelligenceWorkstationModel } from './market-intelligence-workstation-service';
import { getPortfolioIntelligenceViewModel } from './portfolio-intelligence-service';
import { getNewsStreamData } from './news-service';
import { getSimulationWorkstationStateForCurrentUser } from './simulation-workstation-service';
import { getObservationOutcome } from './observation-outcome-service';
import {
  listObservationEvents,
  markObservationEventDismissed,
  markObservationEventPinned,
  markObservationEventRead,
  upsertObservationEvents,
  type ObservationEventRecord,
} from '@repo/db';
import { sortAndFilterWatchlist, type WatchlistFilter, type WatchlistSort } from '../lib/watchlist-intelligence';
import {
  computeAnomalyScore,
  computeTradeReadiness,
  detectMarketRegime,
  mapRiskToSeverity,
  severityFromScore,
  type AnomalyRadarItem,
  type MarketTimelineEvent,
  type ObservationItem,
  type ObservationSeverity,
  type TradeReadinessBreakdown,
} from '../lib/market-observation-engine';
import {
  buildCrossAssetRelationshipInsights,
  type CrossAssetRelationshipInsight,
} from '../lib/cross-asset-relationship-engine';

export type WatchlistIntelligenceItem = {
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'other';
  priceLabel: string;
  changeLabel: string;
  signalAction: string;
  confidence: number | null;
  riskScore: number | null;
  newsSentiment: number | null;
  freshnessLabel: string;
  actions: {
    inspectHref: string;
    compareHref: string;
    simulateHref: string;
  };
};

export type ObserveViewModel = {
  generatedAt: string;
  degraded: boolean;
  summary: {
    regimeLabel: string;
    regimeConfidence: number;
    criticalCount: number;
    warningCount: number;
    watchCount: number;
    infoCount: number;
  };
  regime: ReturnType<typeof detectMarketRegime>;
  observerItems: ObservationItem[];
  timeline: MarketTimelineEvent[];
  anomalies: AnomalyRadarItem[];
  watchlistIntelligence: WatchlistIntelligenceItem[];
  relationshipInsights: CrossAssetRelationshipInsight[];
  tradeReadiness: {
    symbol: string | null;
    result: TradeReadinessBreakdown | null;
  };
  persistenceDegraded: boolean;
};

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  return `$${value.toFixed(2)}`;
}

function normalizeAssetClass(assetClass: string): 'stock' | 'etf' | 'crypto' | 'other' {
  return assetClass === 'stock' || assetClass === 'etf' || assetClass === 'crypto' ? assetClass : 'other';
}

function buildObserverItems(input: {
  nowIso: string;
  degraded: boolean;
  topBullish: Array<{ symbol: string; confidence: number; reason: string; assetClass: 'stock' | 'etf' | 'crypto' | 'other' }>;
  topBearish: Array<{ symbol: string; confidence: number; reason: string; assetClass: 'stock' | 'etf' | 'crypto' | 'other' }>;
  highRisk: Array<{ symbol: string; riskScore: number; assetClass: 'stock' | 'etf' | 'crypto' | 'other' }>;
  anomalies: AnomalyRadarItem[];
  staleProviderCount: number;
  simulationCandidates: Array<{ symbol: string; confidence: number; assetClass: 'stock' | 'etf' | 'crypto' | 'other' }>;
}): ObservationItem[] {
  const items: ObservationItem[] = [];

  for (const bull of input.topBullish.slice(0, 4)) {
    items.push({
      id: `obs-bull-${bull.symbol}`,
      title: `${bull.symbol} bullish alignment`,
      severity: bull.confidence >= 0.75 ? 'INFO' : 'WATCH',
      assetSymbol: bull.symbol,
      assetClass: bull.assetClass,
      reason: bull.reason,
      confidence: bull.confidence,
      source: 'signal',
      createdAt: input.nowIso,
      recommendedNextAction: 'open_signal',
    });
  }

  for (const bear of input.topBearish.slice(0, 4)) {
    items.push({
      id: `obs-bear-${bear.symbol}`,
      title: `${bear.symbol} bearish pressure`,
      severity: bear.confidence >= 0.7 ? 'WARNING' : 'WATCH',
      assetSymbol: bear.symbol,
      assetClass: bear.assetClass,
      reason: bear.reason,
      confidence: bear.confidence,
      source: 'signal',
      createdAt: input.nowIso,
      recommendedNextAction: 'inspect',
    });
  }

  for (const risk of input.highRisk.slice(0, 5)) {
    items.push({
      id: `obs-risk-${risk.symbol}`,
      title: `${risk.symbol} elevated risk`,
      severity: mapRiskToSeverity(risk.riskScore),
      assetSymbol: risk.symbol,
      assetClass: risk.assetClass,
      reason: `Composite risk ${risk.riskScore.toFixed(0)}/100.`,
      confidence: 0.8,
      source: 'risk',
      createdAt: input.nowIso,
      recommendedNextAction: 'inspect',
    });
  }

  for (const anomaly of input.anomalies.slice(0, 5)) {
    items.push({
      id: `obs-anomaly-${anomaly.id}`,
      title: `${anomaly.assetSymbol} ${anomaly.anomalyType.replace('_', ' ')}`,
      severity: anomaly.severity,
      assetSymbol: anomaly.assetSymbol,
      assetClass: anomaly.assetClass,
      reason: anomaly.explanation,
      confidence: anomaly.anomalyScore / 100,
      source: 'anomaly',
      createdAt: anomaly.detectedAt,
      recommendedNextAction: 'inspect',
    });
  }

  if (input.staleProviderCount > 0 || input.degraded) {
    items.push({
      id: 'obs-provider-stale',
      title: 'Provider freshness warning',
      severity: input.staleProviderCount > 20 ? 'CRITICAL' : 'WARNING',
      reason: `${input.staleProviderCount} tracked assets have stale or missing prices.`,
      confidence: 0.9,
      source: 'provider',
      createdAt: input.nowIso,
      recommendedNextAction: 'ignore',
    });
  }

  for (const candidate of input.simulationCandidates.slice(0, 5)) {
    items.push({
      id: `obs-sim-${candidate.symbol}`,
      title: `${candidate.symbol} simulation candidate`,
      severity: candidate.confidence >= 0.72 ? 'INFO' : 'WATCH',
      assetSymbol: candidate.symbol,
      assetClass: candidate.assetClass,
      reason: `Candidate confidence ${(candidate.confidence * 100).toFixed(0)}% and guardrails are reviewable.`,
      confidence: candidate.confidence,
      source: 'portfolio',
      createdAt: input.nowIso,
      recommendedNextAction: 'open_simulation_ticket',
    });
  }

  return items.sort((a, b) => {
    const order: Record<ObservationSeverity, number> = { CRITICAL: 4, WARNING: 3, WATCH: 2, INFO: 1 };
    return order[b.severity] - order[a.severity];
  });
}

function buildTimeline(input: {
  nowIso: string;
  anomalies: AnomalyRadarItem[];
  observerItems: ObservationItem[];
  tradeReadinessSymbol: string | null;
  persistedEvents: ObservationEventRecord[];
}): MarketTimelineEvent[] {
  const events: MarketTimelineEvent[] = [];
  for (const anomaly of input.anomalies) {
    events.push({
      id: `event-anomaly-${anomaly.id}`,
      timestamp: anomaly.detectedAt,
      eventType: anomaly.anomalyType === 'provider_staleness' ? 'provider_degradation' : 'volatility_spike',
      severity: anomaly.severity,
      description: `${anomaly.assetSymbol}: ${anomaly.explanation}`,
      assetSymbol: anomaly.assetSymbol,
      assetClass: anomaly.assetClass,
      relatedId: anomaly.id,
      actionHref: anomaly.inspectionHref,
    });
  }
  for (const item of input.observerItems.slice(0, 12)) {
    events.push({
      id: `event-observation-${item.id}`,
      timestamp: item.createdAt,
      eventType: item.source === 'news' ? 'news_shock' : item.source === 'risk' ? 'portfolio_risk_change' : 'signal_flip',
      severity: item.severity,
      description: item.reason,
      assetSymbol: item.assetSymbol ?? null,
      assetClass: item.assetClass ?? null,
      relatedId: item.id,
      actionHref: item.assetSymbol ? `/stocks/${item.assetSymbol}` : '/market',
    });
  }
  for (const persisted of input.persistedEvents.slice(0, 30)) {
    events.push({
      id: `event-persisted-${persisted.id}`,
      timestamp: persisted.observedAt,
      eventType: (persisted.eventType as MarketTimelineEvent['eventType']) || 'signal_flip',
      severity: persisted.severity,
      description: persisted.description,
      assetSymbol: persisted.symbol,
      assetClass: (persisted.assetClass as MarketTimelineEvent['assetClass']) ?? null,
      relatedId: persisted.id,
      actionHref: `/observe/${persisted.id}`,
    });
  }
  if (input.tradeReadinessSymbol) {
    events.push({
      id: `event-trade-readiness-${input.tradeReadinessSymbol}`,
      timestamp: input.nowIso,
      eventType: 'broker_decision_event',
      severity: 'INFO',
      description: `Trade readiness check updated for ${input.tradeReadinessSymbol}.`,
      assetSymbol: input.tradeReadinessSymbol,
      assetClass: null,
      relatedId: null,
      actionHref: '/invest/simulation',
    });
  }

  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 60);
}

export async function getObserveViewModel(input?: {
  userId?: string | null;
  watchlistSort?: WatchlistSort;
  watchlistFilter?: WatchlistFilter;
}): Promise<ObserveViewModel> {
  const nowIso = new Date().toISOString();
  const [workstation, portfolio, news, simulation] = await Promise.all([
    getMarketIntelligenceWorkstationModel(),
    getPortfolioIntelligenceViewModel(),
    getNewsStreamData(),
    getSimulationWorkstationStateForCurrentUser({ sessionId: null }),
  ]);

  const recommendationBySymbol = new Map(
    workstation.systemState.recommendations.map((row) => [row.symbol, row.recommendation] as const),
  );
  const newsSentimentBySymbol = new Map<string, number | null>(
    Object.entries(workstation.newsBySymbol).map(([symbol, rows]) => [symbol, rows?.[0]?.sentiment ?? null]),
  );
  const assetBySymbol = new Map(
    workstation.assets.map((asset) => [asset.symbol, asset] as const),
  );
  const allocationBySymbol = new Map(
    portfolio.intelligence.allocations.map((row) => [row.symbol, row] as const),
  );
  const staleProviderCount = workstation.assets.filter((asset) => asset.price === null).length;

  const topBullish = workstation.systemState.topOpportunities.map((item) => ({
    symbol: item.symbol,
    confidence: item.recommendation.confidence,
    reason: item.recommendation.explanationText || 'Positive trend + momentum alignment.',
    assetClass: normalizeAssetClass(assetBySymbol.get(item.symbol)?.assetClass ?? 'other'),
  }));
  const topBearish = workstation.systemState.avoidedAssets.map((item) => ({
    symbol: item.symbol,
    confidence: item.recommendation.confidence,
    reason: item.recommendation.explanationText || 'Risk/news pressure dominates.',
    assetClass: normalizeAssetClass(assetBySymbol.get(item.symbol)?.assetClass ?? 'other'),
  }));
  const highRisk = workstation.systemState.highRiskAssets.map((item) => ({
    symbol: item.symbol,
    riskScore: allocationBySymbol.get(item.symbol)?.riskOverlay.riskScore ?? 65,
    assetClass: normalizeAssetClass(assetBySymbol.get(item.symbol)?.assetClass ?? 'other'),
  }));

  const classExposure = portfolio.intelligence.allocations.reduce<Record<string, number>>((acc, item) => {
    acc[item.assetClass] = (acc[item.assetClass] ?? 0) + item.targetWeight;
    return acc;
  }, {});

  const anomalies: AnomalyRadarItem[] = workstation.assets
    .map((asset) => {
      const rec = recommendationBySymbol.get(asset.symbol);
      const allocation = allocationBySymbol.get(asset.symbol);
      const priceShock = asset.changePercent === null ? null : Math.min(1, Math.abs(asset.changePercent) / 12);
      const volatilityShock = Math.min(1, Math.abs(asset.volatilityScore));
      const confidenceDrop = rec ? Math.max(0, (0.55 - rec.confidence) / 0.55) : null;
      const correlationBreakdown = Math.min(1, (classExposure[normalizeAssetClass(asset.assetClass)] ?? 0) * 1.6);
      const providerStaleness = asset.price === null ? 1 : 0;
      const newsShock = Math.min(1, Math.abs((asset.newsImpactScore ?? 0.5) - 0.5) * 2);
      const liquidityStress = allocation ? Math.min(1, allocation.riskOverlay.liquidityRisk) : 0.45;
      const anomalyScore = computeAnomalyScore({
        priceShock,
        volatilityShock,
        confidenceDrop,
        correlationBreakdown,
        providerStaleness,
        newsShock,
        liquidityStress,
      });
      if (anomalyScore === null) return null;

      const strongest =
        providerStaleness >= 0.8 ? 'provider_staleness'
          : volatilityShock >= 0.65 ? 'volatility_explosion'
            : priceShock !== null && priceShock >= 0.65 ? 'price_spike'
              : newsShock >= 0.62 ? 'news_sentiment_shift'
                : confidenceDrop !== null && confidenceDrop >= 0.55 ? 'confidence_drop'
                  : correlationBreakdown >= 0.6 ? 'correlation_breakdown'
                    : 'volume_anomaly';

      return {
        id: `${asset.symbol}-${strongest}`,
        assetSymbol: asset.symbol,
        assetClass: normalizeAssetClass(asset.assetClass),
        anomalyType: strongest,
        anomalyScore,
        severity: severityFromScore(anomalyScore),
        explanation: `Anomaly score ${anomalyScore.toFixed(0)}/100 from price, volatility, confidence, news, correlation, and provider freshness factors.`,
        detectedAt: nowIso,
        inspectionHref: `/stocks/${asset.symbol}`,
      } satisfies AnomalyRadarItem;
    })
    .filter((item): item is AnomalyRadarItem => Boolean(item))
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, 30);

  const simulationCandidates = workstation.systemState.topOpportunities.map((item) => ({
    symbol: item.symbol,
    confidence: item.recommendation.confidence,
    assetClass: normalizeAssetClass(assetBySymbol.get(item.symbol)?.assetClass ?? 'other'),
  }));

  const observerItems = buildObserverItems({
    nowIso,
    degraded: workstation.systemState.degraded || news.degraded,
    topBullish,
    topBearish,
    highRisk,
    anomalies,
    staleProviderCount,
    simulationCandidates,
  });

  const watchlistIntelligence: WatchlistIntelligenceItem[] = simulation.watchlist.map((row) => {
    const rec = recommendationBySymbol.get(row.asset.symbol);
    const allocation = allocationBySymbol.get(row.asset.symbol);
    const sentiment = workstation.newsBySymbol[row.asset.symbol]?.[0]?.sentiment ?? null;
    const freshnessLabel = row.quote?.observedAt ?? row.quote?.fetchedAt ?? null;

    return {
      symbol: row.asset.symbol,
      name: row.asset.name,
      assetClass: normalizeAssetClass(row.asset.assetClass),
      priceLabel: formatPrice(row.quote?.price),
      changeLabel: formatPct(row.quote?.changePercent ?? null),
      signalAction: rec?.action ?? 'HOLD',
      confidence: rec?.confidence ?? null,
      riskScore: allocation?.riskOverlay.riskScore ?? null,
      newsSentiment: sentiment,
      freshnessLabel: freshnessLabel ? `Updated ${new Date(freshnessLabel).toLocaleTimeString('en-US')}` : 'stale',
      actions: {
        inspectHref: `/stocks/${row.asset.symbol}`,
        compareHref: `/market`,
        simulateHref: `/invest/simulation`,
      },
    };
  });

  const sortedWatchlist = sortAndFilterWatchlist(
    watchlistIntelligence,
    input?.watchlistSort ?? 'strongest_signal',
    input?.watchlistFilter ?? { assetClass: 'all', signalAction: 'all', risk: 'all', news: 'all', search: '' },
  );
  const relationshipInsights = buildCrossAssetRelationshipInsights(
    workstation.assets.map((asset) => {
      const recommendation = recommendationBySymbol.get(asset.symbol);
      const normalizedAction = recommendation?.action === 'BUY' || recommendation?.action === 'STRONG_BUY'
        ? 'BUY'
        : recommendation?.action === 'SELL' || recommendation?.action === 'STRONG_SELL'
          ? 'SELL'
          : recommendation?.action === 'REDUCE'
            ? 'REDUCE'
            : 'HOLD';
      return {
        symbol: asset.symbol,
        assetClass: normalizeAssetClass(asset.assetClass),
        changePercent: asset.changePercent,
        confidence: recommendation?.confidence ?? null,
        action: normalizedAction,
        newsSentiment: newsSentimentBySymbol.get(asset.symbol) ?? null,
      };
    }),
  );
  const selectedReadinessAsset = sortedWatchlist[0]?.symbol ?? topBullish[0]?.symbol ?? null;
  const selectedRec = selectedReadinessAsset ? recommendationBySymbol.get(selectedReadinessAsset) : null;
  const selectedRisk = selectedReadinessAsset ? allocationBySymbol.get(selectedReadinessAsset)?.riskOverlay.riskScore ?? null : null;
  const selectedLiquidity = selectedReadinessAsset ? allocationBySymbol.get(selectedReadinessAsset)?.riskOverlay.liquidityRisk : null;
  const selectedNewsRisk = selectedReadinessAsset
    ? (workstation.systemState.assetStates.find((row) => row.symbol === selectedReadinessAsset)?.newsImpact.riskFlag ?? null)
    : null;

  const tradeReadiness = selectedReadinessAsset
    ? computeTradeReadiness({
      signalAlignment: selectedRec ? selectedRec.scoreBreakdown.signalScore * 2 - 1 : null,
      confidence: selectedRec?.confidence ?? null,
      riskScore: selectedRisk,
      liquidityScore: selectedLiquidity === null || selectedLiquidity === undefined ? null : 1 - selectedLiquidity,
      newsRisk: selectedNewsRisk,
      providerDegraded: workstation.systemState.degraded,
      portfolioConcentrationRisk: portfolio.intelligence.diagnostics.concentrationScore,
      microTradingFit: selectedLiquidity === null || selectedLiquidity === undefined ? null : 1 - selectedLiquidity * 0.8,
    })
    : null;

  let persistenceDegraded = false;
  let persistedEvents: ObservationEventRecord[] = [];
  if (input?.userId) {
    const eventPayload = observerItems.map((item) => ({
      userId: input.userId ?? null,
      symbol: item.assetSymbol ?? null,
      assetClass: item.assetClass ?? null,
      source: item.source,
      eventType: item.source === 'news' ? 'news_shock' : item.source === 'risk' ? 'portfolio_risk_change' : 'signal_flip',
      severity: item.severity,
      title: item.title,
      description: item.reason,
      confidence: item.confidence,
      score: null,
      observedAt: item.createdAt,
      metadata: { recommendedNextAction: item.recommendedNextAction },
    }));

    try {
      await upsertObservationEvents([...eventPayload]);
      persistedEvents = await listObservationEvents({ userId: input.userId, limit: 120 });
    } catch {
      persistenceDegraded = true;
    }
  }

  const timelineRaw = buildTimeline({
    nowIso,
    anomalies,
    observerItems,
    tradeReadinessSymbol: selectedReadinessAsset,
    persistedEvents,
  });
  const timeline = await Promise.all(timelineRaw.map(async (event) => {
    const outcome = input?.userId
      ? await getObservationOutcome({ userId: input.userId, relatedOrderId: event.eventType === 'simulated_order_event' ? event.relatedId : null })
      : null;
    return {
      ...event,
      description: outcome ? `${event.description} (${outcome.outcomeStatus.toLowerCase()})` : event.description,
    };
  }));

  const avgSignal = workstation.systemState.assetStates.length > 0
    ? workstation.systemState.assetStates.reduce((sum, asset) => sum + asset.compositeScore, 0) / workstation.systemState.assetStates.length
    : 0;
  const breadth = workstation.systemState.assetStates.length > 0
    ? workstation.systemState.assetStates.filter((asset) => asset.recommendation.action === 'BUY' || asset.recommendation.action === 'STRONG_BUY').length / workstation.systemState.assetStates.length
    : 0.5;
  const newsSentiment = news.items.length > 0
    ? news.items.reduce((sum, item) => sum + (item.sentimentScore ?? 0), 0) / news.items.length
    : 0;
  const cryptoRows = workstation.assets.filter((asset) => asset.assetClass === 'crypto');
  const cryptoVol = cryptoRows.length > 0 ? cryptoRows.reduce((sum, row) => sum + Math.abs(row.volatilityScore), 0) / cryptoRows.length : 0.4;
  const providerQuality = workstation.systemState.providerHealthSummary.total > 0
    ? workstation.systemState.providerHealthSummary.healthy / workstation.systemState.providerHealthSummary.total
    : 0.5;

  const regime = detectMarketRegime({
    averageSignalScore: avgSignal,
    averageConfidence: portfolio.intelligence.diagnostics.averageConfidence,
    breadth,
    newsSentiment,
    cryptoVolatility: cryptoVol,
    providerQuality,
    liquidityStress: 1 - (portfolio.intelligence.diagnostics.averageRiskScore / 100),
  });

  const criticalCount = observerItems.filter((item) => item.severity === 'CRITICAL').length;
  const warningCount = observerItems.filter((item) => item.severity === 'WARNING').length;
  const watchCount = observerItems.filter((item) => item.severity === 'WATCH').length;
  const infoCount = observerItems.filter((item) => item.severity === 'INFO').length;

  return {
    generatedAt: nowIso,
    degraded: workstation.systemState.degraded || news.degraded || portfolio.status !== 'nominal',
    summary: {
      regimeLabel: regime.label,
      regimeConfidence: regime.confidence,
      criticalCount,
      warningCount,
      watchCount,
      infoCount,
    },
    regime,
    observerItems,
    timeline,
    anomalies,
    watchlistIntelligence: sortedWatchlist,
    relationshipInsights,
    tradeReadiness: {
      symbol: selectedReadinessAsset,
      result: tradeReadiness,
    },
    persistenceDegraded,
  };
}

export async function updateObservationInteraction(input: {
  userId: string;
  eventId: string;
  action: 'read' | 'pin' | 'dismiss';
  value?: boolean;
}) {
  if (input.action === 'read') {
    await markObservationEventRead(input.eventId, input.userId, input.value ?? true);
    return;
  }
  if (input.action === 'pin') {
    await markObservationEventPinned(input.eventId, input.userId, input.value ?? true);
    return;
  }
  await markObservationEventDismissed(input.eventId, input.userId, input.value ?? true);
}
