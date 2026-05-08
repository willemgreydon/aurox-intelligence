import { getAlertCenterViewModel } from './alert-center-service';
import { getObserveViewModel } from './market-observation-service';
import { getPortfolioIntelligenceViewModel } from './portfolio-intelligence-service';
import { getNewsStreamData } from './news-service';
import { getAdminMonitoringData } from './admin-service';

export type DashboardExecutiveViewModel = {
  generatedAt: string;
  degraded: boolean;
  hero: {
    title: string;
    subtitle: string;
    chips: Array<{ label: string; value: string; tone: 'success' | 'warning' | 'neutral' | 'info' }>;
  };
  kpis: Array<{
    id: string;
    label: string;
    value: string;
    detail: string;
    tone: 'success' | 'warning' | 'neutral' | 'info';
    href: string;
  }>;
  marketPulse: Array<{ symbol: string; price: string; move: string; freshness: string }>;
  observations: Array<{ id: string; title: string; severity: string; reason: string; href: string }>;
  relationships: Array<{ id: string; title: string; severity: string; narrative: string; symbols: string[] }>;
  alertQueue: Array<{ id: string; title: string; severity: string; status: string; symbol: string | null; href: string }>;
  simulationReadiness: {
    symbol: string | null;
    status: string;
    explanation: string[];
  };
  providerHealth: {
    healthy: number;
    degraded: number;
    total: number;
    summary: string;
  };
  signalSnapshot: {
    buy: number;
    sell: number;
    hold: number;
    avgConfidence: string;
  };
  portfolioSnapshot: {
    value: string;
    state: string;
    openPositions: string;
    riskScore: string;
  };
  newsSnapshot: {
    shockCount: string;
    headlines: Array<{ id: string; title: string; source: string; href: string | null }>;
  };
  assetClassSnapshot: Array<{ assetClass: string; count: number; avgConfidence: string; href: string }>;
};

function safePct(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Unavailable';
  return `${(value * 100).toFixed(1)}%`;
}

function safeCurrency(value: number | null | undefined, currency: 'USD' | 'EUR' = 'EUR') {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function mapToneFromSeverity(severity: string): 'success' | 'warning' | 'neutral' | 'info' {
  if (severity === 'CRITICAL' || severity === 'WARNING') return 'warning';
  if (severity === 'WATCH') return 'info';
  if (severity === 'INFO') return 'success';
  return 'neutral';
}

export async function getDashboardExecutiveViewModel(input: {
  userId: string;
}): Promise<DashboardExecutiveViewModel> {
  const observe = await getObserveViewModel({ userId: input.userId });
  const [alerts, portfolio, news, admin] = await Promise.all([
    getAlertCenterViewModel({ userId: input.userId, observeModel: observe }),
    getPortfolioIntelligenceViewModel(),
    getNewsStreamData().catch(() => ({ degraded: true, items: [] as never[] })),
    getAdminMonitoringData().catch(() => null),
  ]);

  const providerTotal = admin?.providers.length ?? 0;
  const providerHealthy = admin?.providers.filter((p) => p.status === 'nominal').length ?? 0;
  const providerDegraded = providerTotal - providerHealthy;
  const avgConfidenceValue = observe.watchlistIntelligence
    .map((row) => row.confidence)
    .filter((value): value is number => typeof value === 'number')
    .reduce((sum, value, _, arr) => sum + value / Math.max(1, arr.length), 0);
  const riskScore = portfolio.intelligence.diagnostics.averageRiskScore;
  const newsShockCount = news.items.filter((item) => Math.abs(item.sentimentScore ?? 0) > 0.45).length;

  const signalCounts = observe.watchlistIntelligence.reduce(
    (acc, row) => {
      const action = row.signalAction.toUpperCase();
      if (action === 'BUY') acc.buy += 1;
      else if (action === 'SELL') acc.sell += 1;
      else acc.hold += 1;
      return acc;
    },
    { buy: 0, sell: 0, hold: 0 },
  );

  const byClass = observe.watchlistIntelligence.reduce<Record<string, { count: number; confidence: number[] }>>((acc, row) => {
    const key = row.assetClass;
    if (!acc[key]) acc[key] = { count: 0, confidence: [] };
    acc[key]!.count += 1;
    if (typeof row.confidence === 'number') acc[key]!.confidence.push(row.confidence);
    return acc;
  }, {});

  const generatedAt = new Date().toISOString();
  const degraded = observe.degraded || alerts.persistenceDegraded || portfolio.status === 'degraded' || news.degraded || providerDegraded > 0;
  const marketPulse = observe.watchlistIntelligence.slice(0, 6).map((row) => ({
    symbol: row.symbol,
    price: row.priceLabel,
    move: row.changeLabel,
    freshness: row.freshnessLabel,
  }));

  return {
    generatedAt,
    degraded,
    hero: {
      title: 'Aurox Intelligence Dashboard',
      subtitle: `Executive command surface for ${observe.regime.label} regime monitoring, simulation preparation, and explainable cross-asset intelligence.`,
      chips: [
        { label: 'Mode', value: 'Simulation-only', tone: 'info' },
        { label: 'Provider status', value: providerDegraded > 0 ? `${providerDegraded}/${providerTotal} degraded` : 'Nominal', tone: providerDegraded > 0 ? 'warning' : 'success' },
        { label: 'Latest snapshot', value: new Date(observe.generatedAt).toLocaleString('en-US'), tone: 'neutral' },
        { label: 'Open alerts', value: String(alerts.summary.open), tone: alerts.summary.critical > 0 ? 'warning' : 'info' },
      ],
    },
    kpis: [
      { id: 'portfolio', label: 'Portfolio Value', value: safeCurrency(portfolio.portfolioContext.portfolioValue, portfolio.portfolioContext.baseCurrency), detail: portfolio.portfolioContext.stateReason, tone: portfolio.status === 'nominal' ? 'success' : 'warning', href: '/portfolio/intelligence' },
      { id: 'alerts', label: 'Open Alerts', value: String(alerts.summary.open), detail: `${alerts.summary.critical} critical, ${alerts.summary.warning} warning`, tone: alerts.summary.critical > 0 ? 'warning' : 'info', href: '/alerts' },
      { id: 'regime', label: 'Market Regime', value: observe.regime.label, detail: `${(observe.regime.confidence * 100).toFixed(0)}% confidence`, tone: 'neutral', href: '/observe' },
      { id: 'confidence', label: 'Avg Signal Confidence', value: safePct(avgConfidenceValue), detail: 'Watchlist-weighted confidence snapshot', tone: 'info', href: '/signals' },
      { id: 'risk', label: 'Risk Score', value: `${riskScore.toFixed(1)}/100`, detail: 'Portfolio intelligence risk overlay', tone: riskScore > 60 ? 'warning' : 'success', href: '/portfolio/intelligence' },
      { id: 'news', label: 'News Shock Count', value: String(newsShockCount), detail: 'High-sentiment-impact headlines', tone: newsShockCount > 0 ? 'warning' : 'success', href: '/news' },
      { id: 'provider', label: 'Provider Health', value: providerTotal > 0 ? `${providerHealthy}/${providerTotal}` : 'Unavailable', detail: 'Nominal provider checks', tone: providerDegraded > 0 ? 'warning' : 'success', href: '/admin/monitoring/providers' },
    ],
    marketPulse,
    observations: observe.observerItems.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      reason: item.reason,
      href: item.assetSymbol ? `/stocks/${item.assetSymbol}` : '/observe',
    })),
    relationships: observe.relationshipInsights.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      narrative: item.narrative,
      symbols: item.symbols,
    })),
    alertQueue: [...alerts.grouped.CRITICAL, ...alerts.grouped.WARNING, ...alerts.grouped.WATCH, ...alerts.grouped.INFO]
      .slice(0, 8)
      .map((row) => ({
        id: row.id,
        title: row.title,
        severity: row.severity,
        status: row.status ?? 'OPEN',
        symbol: row.symbol ?? null,
        href: `/replay/${row.id}`,
      })),
    simulationReadiness: {
      symbol: observe.tradeReadiness.symbol,
      status: observe.tradeReadiness.result?.status ?? 'Unavailable',
      explanation: observe.tradeReadiness.result?.explanation ?? ['No readiness context available.'],
    },
    providerHealth: {
      healthy: providerHealthy,
      degraded: providerDegraded,
      total: providerTotal,
      summary: providerTotal > 0 ? `${providerHealthy}/${providerTotal} providers nominal.` : 'Provider monitoring unavailable.',
    },
    signalSnapshot: {
      buy: signalCounts.buy,
      sell: signalCounts.sell,
      hold: signalCounts.hold,
      avgConfidence: safePct(avgConfidenceValue),
    },
    portfolioSnapshot: {
      value: safeCurrency(portfolio.portfolioContext.portfolioValue, portfolio.portfolioContext.baseCurrency),
      state: portfolio.portfolioContext.state,
      openPositions: String(portfolio.portfolioContext.openPositionCount),
      riskScore: `${riskScore.toFixed(1)}/100`,
    },
    newsSnapshot: {
      shockCount: String(newsShockCount),
      headlines: news.items.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        source: item.source,
        href: item.url ?? null,
      })),
    },
    assetClassSnapshot: Object.entries(byClass).map(([assetClass, entry]) => ({
      assetClass,
      count: entry.count,
      avgConfidence: safePct(entry.confidence.length > 0 ? entry.confidence.reduce((sum, value) => sum + value, 0) / entry.confidence.length : null),
      href: assetClass === 'etf' ? '/invest/etfs' : assetClass === 'crypto' ? '/invest/crypto' : '/invest/stocks',
    })),
  };
}

export function dashboardKpiLinksAreInternal(model: DashboardExecutiveViewModel) {
  return model.kpis.every((kpi) => kpi.href.startsWith('/'));
}
