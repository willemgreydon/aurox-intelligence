import { getOptionalCurrentSession } from '../auth/session';
import { withDbReadFallback } from '../lib/db-runtime';
import { getForecastsPageData } from './analysis-service';
import { getSimulationOverviewDataForUser, type SimulationOverviewData } from './stock-simulation-service';
import type { ForecastsPageViewModel } from '../mappers/analysis-mapper';

export type LaneComparisonRow = {
  id: string;
  label: string;
  mode: 'manual' | 'ai-assisted' | 'strategy';
  status: 'active' | 'limited' | 'planned';
  capitalLimit: number;
  allocatedCapital: number;
  availableCapital: number;
  utilizationPct: number;
  activePositions: number;
  recentOrders: number;
  capitalLimitLabel: string;
  allocatedLabel: string;
  availableLabel: string;
  utilizationLabel: string;
};

export type ForecastBiasBucket = {
  bias: 'bullish' | 'bearish' | 'neutral';
  label: string;
  count: number;
  pct: number;
};

export type ForecastWorkstationStat = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: 'positive' | 'negative' | 'neutral';
};

export type ForecastWorkstationInsight = {
  id: string;
  title: string;
  body: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
};

export type ForecastWorkstationData = {
  overview: ForecastsPageViewModel['overview'];
  forecasts: ForecastsPageViewModel['forecasts'];
  isAuthenticated: boolean;
  hasPortfolio: boolean;
  stats: ForecastWorkstationStat[];
  lanes: LaneComparisonRow[];
  biasDistribution: ForecastBiasBucket[];
  insights: ForecastWorkstationInsight[];
  degraded: boolean;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedUsd(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatUsd(Math.abs(value))}`;
}

function pnlTone(value: number): 'positive' | 'negative' | 'neutral' {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function buildLaneComparison(overview: SimulationOverviewData | null): LaneComparisonRow[] {
  if (!overview) return [];
  return overview.activityLanes.map((lane) => {
    const utilizationPct = lane.capitalLimit > 0
      ? Math.min(100, Math.round((lane.allocatedCapital / lane.capitalLimit) * 100))
      : 0;
    return {
      id: lane.id,
      label: lane.label,
      mode: lane.mode,
      status: lane.status,
      capitalLimit: lane.capitalLimit,
      allocatedCapital: lane.allocatedCapital,
      availableCapital: lane.availableCapital,
      utilizationPct,
      activePositions: lane.activePositions,
      recentOrders: lane.recentOrders,
      capitalLimitLabel: formatUsd(lane.capitalLimit),
      allocatedLabel: formatUsd(lane.allocatedCapital),
      availableLabel: formatUsd(lane.availableCapital),
      utilizationLabel: `${utilizationPct}%`,
    };
  });
}

function buildBiasDistribution(forecasts: ForecastsPageViewModel['forecasts']): ForecastBiasBucket[] {
  const counts = { bullish: 0, bearish: 0, neutral: 0 };
  for (const forecast of forecasts) {
    const bias = forecast.directionalBias;
    if (bias === 'bullish' || bias === 'bearish' || bias === 'neutral') {
      counts[bias] += 1;
    }
  }
  const total = forecasts.length || 1;
  return [
    { bias: 'bullish' as const, label: 'Bullish', count: counts.bullish, pct: Math.round((counts.bullish / total) * 100) },
    { bias: 'neutral' as const, label: 'Neutral', count: counts.neutral, pct: Math.round((counts.neutral / total) * 100) },
    { bias: 'bearish' as const, label: 'Bearish', count: counts.bearish, pct: Math.round((counts.bearish / total) * 100) },
  ];
}

function buildStats(
  forecasts: ForecastsPageViewModel['forecasts'],
  overview: SimulationOverviewData | null,
): ForecastWorkstationStat[] {
  const stats: ForecastWorkstationStat[] = [];

  if (overview) {
    const summary = overview.summary;
    const totalReturn = summary.unrealizedPnl + summary.realizedPnl;
    stats.push(
      {
        id: 'portfolio-value',
        label: 'Portfolio value',
        value: formatUsd(summary.portfolioValue),
        detail: 'Current market value of simulated positions plus cash.',
        tone: 'neutral',
      },
      {
        id: 'invested',
        label: 'Deployed capital',
        value: formatUsd(summary.investedCapital),
        detail: `${summary.activeInvestmentCount} active position${summary.activeInvestmentCount === 1 ? '' : 's'}.`,
        tone: 'neutral',
      },
      {
        id: 'total-return',
        label: 'Total P&L',
        value: formatSignedUsd(totalReturn),
        detail: `Unrealized ${formatSignedUsd(summary.unrealizedPnl)} · Realized ${formatSignedUsd(summary.realizedPnl)}.`,
        tone: pnlTone(totalReturn),
      },
    );
  }

  const avgConfidence = forecasts.length > 0
    ? Math.round((forecasts.reduce((sum, f) => sum + f.confidenceScore, 0) / forecasts.length) * 100)
    : 0;
  stats.push({
    id: 'forecast-coverage',
    label: 'Forecast coverage',
    value: String(forecasts.length),
    detail: `${avgConfidence}% average model confidence across tracked assets.`,
    tone: 'neutral',
  });

  return stats;
}

function buildInsights(
  forecasts: ForecastsPageViewModel['forecasts'],
  lanes: LaneComparisonRow[],
  bias: ForecastBiasBucket[],
  overview: SimulationOverviewData | null,
): ForecastWorkstationInsight[] {
  const insights: ForecastWorkstationInsight[] = [];

  const bullish = bias.find((b) => b.bias === 'bullish');
  const bearish = bias.find((b) => b.bias === 'bearish');
  if (bullish && bearish && forecasts.length > 0) {
    if (bullish.count > bearish.count) {
      insights.push({
        id: 'bias-skew',
        title: 'Forecast skew is constructive',
        body: `${bullish.count} of ${forecasts.length} tracked assets carry a bullish short-horizon bias versus ${bearish.count} bearish. Treat as context, not a directive.`,
        tone: 'success',
      });
    } else if (bearish.count > bullish.count) {
      insights.push({
        id: 'bias-skew',
        title: 'Forecast skew is defensive',
        body: `${bearish.count} of ${forecasts.length} tracked assets carry a bearish short-horizon bias versus ${bullish.count} bullish. Review exposure before adding risk.`,
        tone: 'warning',
      });
    } else {
      insights.push({
        id: 'bias-skew',
        title: 'Forecast skew is balanced',
        body: `Bullish and bearish biases are evenly split across ${forecasts.length} tracked assets. No directional edge in aggregate.`,
        tone: 'info',
      });
    }
  }

  if (overview) {
    const activeLanes = lanes.filter((lane) => lane.status === 'active');
    const deployed = activeLanes.reduce((sum, lane) => sum + lane.allocatedCapital, 0);
    const capacity = activeLanes.reduce((sum, lane) => sum + lane.capitalLimit, 0);
    const utilization = capacity > 0 ? Math.round((deployed / capacity) * 100) : 0;
    insights.push({
      id: 'lane-utilization',
      title: `Active lanes are ${utilization}% deployed`,
      body: capacity > 0
        ? `${formatUsd(deployed)} of ${formatUsd(capacity)} simulated capacity is allocated across active lanes. Remaining headroom can absorb new simulated positions.`
        : 'No active-lane capital capacity is configured yet.',
      tone: utilization > 85 ? 'warning' : 'info',
    });
  } else {
    insights.push({
      id: 'no-portfolio',
      title: 'Sign in to compare your lanes',
      body: 'Lane investment comparison and portfolio statistics appear once you start a simulation session. Forecasts below are available to everyone.',
      tone: 'info',
    });
  }

  const lead = forecasts[0];
  if (lead) {
    insights.push({
      id: 'lead-forecast',
      title: `${lead.assetName} leads the forecast stack`,
      body: `${lead.biasLabel} bias at ${lead.confidenceLabel}. ${lead.keyDrivers.slice(0, 2).join('; ') || 'Driven by composite signal inputs.'}`,
      tone: lead.directionalBias === 'bullish' ? 'success' : lead.directionalBias === 'bearish' ? 'danger' : 'info',
    });
  }

  return insights;
}

export async function getForecastWorkstationData(): Promise<ForecastWorkstationData> {
  const [forecastsPage, auth] = await Promise.all([
    getForecastsPageData(),
    getOptionalCurrentSession(),
  ]);

  const overviewResult = auth
    ? await withDbReadFallback<SimulationOverviewData | null>('forecasts:overview', null, () =>
        getSimulationOverviewDataForUser(auth.user.id),
      )
    : { value: null, degraded: false, reason: null as string | null };

  const overview = overviewResult.value;
  const forecasts = forecastsPage.forecasts;
  const lanes = buildLaneComparison(overview);
  const biasDistribution = buildBiasDistribution(forecasts);
  const stats = buildStats(forecasts, overview);
  const insights = buildInsights(forecasts, lanes, biasDistribution, overview);

  return {
    overview: forecastsPage.overview,
    forecasts,
    isAuthenticated: Boolean(auth),
    hasPortfolio: Boolean(overview),
    stats,
    lanes,
    biasDistribution,
    insights,
    degraded: overviewResult.degraded,
  };
}
