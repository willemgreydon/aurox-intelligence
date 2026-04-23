import { listSimulatedOrdersForUser, listSimulationTransactionsForUser, getUserWatchlist } from '@repo/db';
import { DashboardPageHeader } from '../../components/dashboard/dashboard-page-header';
import { ForecastSummaryCard } from '../../components/dashboard/forecast-summary-card';
import { MetricCard } from '../../components/dashboard/metric-card';
import { ModuleNavCard } from '../../components/dashboard/module-nav-card';
import { BarChartPanel } from '../../components/charts/bar-chart-panel';
import { InsightCallout } from '../../components/analytics/insight-callout';
import { ComparisonBarPanel } from '../../components/charts/comparison-bar-panel';
import { ChartToolbar } from '../../components/charts/chart-toolbar';
import { DistributionChartCard } from '../../components/charts/distribution-chart-card';
import { DonutChartPanel } from '../../components/charts/donut-chart-panel';
import { HeatmapPanel } from '../../components/charts/heatmap-panel';
import { LineTrendPanel } from '../../components/charts/line-trend-panel';
import { AnalysisToolbar } from '../../components/filters/analysis-toolbar';
import { CompactStatCard } from '../../components/stats/compact-stat-card';
import { StatComparisonCard } from '../../components/stats/stat-comparison-card';
import { AnalyticsTable } from '../../components/tables/analytics-table';
import { Card } from '../../components/ui/card';
import { SystemStatusPanel } from '../../components/dashboard/system-status-panel';
import { Section } from '../../components/ui/section';
import { getMessages } from '../../lib/i18n/messages';
import {
  forecastTableColumns,
  providerTableColumns,
  type TableColumn,
} from '../../lib/dashboard/analytics-fixtures';
import { resolveChartType, resolveTimePeriod } from '../../lib/workspace';
import { buildChangeDistribution, buildComparisonBars, countDirectionalMoves } from '../../lib/market-surface';
import { getInvestOverviewData } from '../../server/services/invest-service';
import { getDashboardData } from '../../server/services/dashboard-service';
import { getDashboardMarketAnalyticsData } from '../../server/services/dashboard-market-service';
import { getStocksOverviewData } from '../../server/services/stocks-service';
import { getWorkspacePreferences } from '../../server/services/workspace-service';
import { getRequestLocale } from '../../server/i18n/locale';
import { formatFreshnessLabel, formatUsdPrice } from '../../server/lib/quote-display';

type StockSnapshotRow = {
  symbol: string;
  price: string;
  move: string;
  source: string;
  freshness: string;
};

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { userId, preset } = await getWorkspacePreferences();
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const chartType = resolveChartType(getSearchParamValue(resolvedSearchParams?.chart), preset?.defaultChartType ?? 'trend');
  const timePeriod = resolveTimePeriod(getSearchParamValue(resolvedSearchParams?.period), preset?.defaultTimePeriod ?? '1mo');

  const [dashboard, stocks, liveAnalytics, invest, watchlist, orders, transactions] = await Promise.all([
    getDashboardData(),
    getStocksOverviewData(),
    getDashboardMarketAnalyticsData(),
    getInvestOverviewData(locale, messages),
    userId ? getUserWatchlist(userId) : Promise.resolve([]),
    userId ? listSimulatedOrdersForUser(userId) : Promise.resolve([]),
    userId ? listSimulationTransactionsForUser(userId) : Promise.resolve([]),
  ]);
  const moveCounts = countDirectionalMoves(stocks.trackedStocks.map((item) => item.changePercent));
  const liveMoverBars = buildComparisonBars(
    stocks.topMovers.map((item) => ({
      label: item.symbol,
      value: item.changePercent,
    })),
    4,
  );
  const liveMoveDistribution = buildChangeDistribution(stocks.trackedStocks.map((item) => item.changePercent));
  const stockRows = stocks.trackedStocks.map((item) => ({
    symbol: item.symbol,
    price: item.priceLabel,
    move: item.changeLabel,
    source: item.source.toUpperCase(),
    freshness: item.freshnessLabel,
  }));
  const positiveBreadthDelta =
    stocks.trackedStocks.length > 0
      ? { value: `${Math.round((moveCounts.positive / stocks.trackedStocks.length) * 100)}% of set`, direction: 'up' as const, tone: 'positive' as const }
      : null;
  const negativeBreadthDelta =
    stocks.trackedStocks.length > 0
      ? {
          value: `${Math.round((moveCounts.negative / stocks.trackedStocks.length) * 100)}% of set`,
          direction: 'down' as const,
          tone: moveCounts.negative > 0 ? ('negative' as const) : ('neutral' as const),
        }
      : null;
  const forecastRows = dashboard.forecastOverview.items.map((item) => ({
    asset: item.symbol,
    horizon: item.horizon,
    bias: item.biasLabel,
    confidence: item.confidenceLabel,
    freshness: item.producedAtLabel,
  }));
  const providerRows = dashboard.systemStatuses.map((status) => ({
    provider: status.name,
    status: status.statusLabel,
    lastSync: status.lastUpdatedLabel,
    note: status.summary,
  }));
  const visibleModules = preset?.visibleModules ?? ['market-overview', 'watchlist', 'forecast-analysis', 'broker-tools', 'system-observation'];
  const localizedStockSnapshotColumns: Array<TableColumn<StockSnapshotRow>> = [
    { key: 'symbol', label: messages.dashboard.stockColumn },
    { key: 'price', label: messages.dashboard.priceColumn, align: 'right' },
    { key: 'move', label: messages.dashboard.moveColumn, align: 'right' },
    { key: 'source', label: messages.dashboard.sourceColumn },
    { key: 'freshness', label: messages.dashboard.freshnessColumn, align: 'right' },
  ];
  const watchlistCards = watchlist
    .map((item) => {
      const featuredAsset = invest.featuredAssets.find((asset) => asset.assetId === item.assetId);

      if (featuredAsset) {
        return {
          key: featuredAsset.assetId,
          eyebrow: featuredAsset.assetClass,
          title: featuredAsset.name,
          summary: featuredAsset.riskSummary,
          symbol: featuredAsset.symbol,
          priceLabel: formatUsdPrice(featuredAsset.price, locale, messages.common.unavailable),
          freshnessLabel: formatFreshnessLabel(featuredAsset.lastUpdatedAt, locale, messages.common.unavailable),
        };
      }

      const trackedAsset = stocks.trackedStocks.find((asset) => asset.symbol === item.symbol);

      if (!trackedAsset) {
        return null;
      }

      return {
        key: trackedAsset.symbol,
        eyebrow: 'stock',
        title: trackedAsset.symbol,
        summary: 'Saved from your personalized dashboard preset.',
        symbol: trackedAsset.symbol,
        priceLabel: trackedAsset.priceLabel,
        freshnessLabel: trackedAsset.freshnessLabel,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const breadthSegments = [
    { label: 'Positive', value: moveCounts.positive, tone: 'positive' as const },
    { label: 'Negative', value: moveCounts.negative, tone: 'negative' as const },
    { label: 'Flat', value: moveCounts.flat, tone: 'neutral' as const },
  ];
  const marketOverviewChart = (() => {
    switch (chartType) {
      case 'comparison':
        return (
          <ComparisonBarPanel
            title="Live stock movers"
            subtitle="Real-time move spread across the tracked stock set loaded from the provider boundary."
            items={liveMoverBars}
          />
        );
      case 'bar':
        return (
          <BarChartPanel
            title="Market breadth bars"
            subtitle="Current positive, negative, and neutral breadth counts in the tracked equity set."
            items={breadthSegments.map((segment) => ({ label: segment.label, value: segment.value }))}
          />
        );
      case 'donut':
        return (
          <DonutChartPanel
            title="Breadth mix"
            subtitle="Share of the tracked set currently positive, negative, and flat."
            segments={breadthSegments}
          />
        );
      case 'stock':
      case 'trend':
      default:
        return (
          <LineTrendPanel
            title="Market trend and confidence envelope"
            subtitle="Provider-backed line trend pairing a live primary series, benchmark reference, and simple confidence band."
            points={liveAnalytics.trendSeries}
            rail={
              <div className="side-metrics">
                <div className="side-metrics__item">
                  <span>Chart</span>
                  <strong>{chartType}</strong>
                </div>
                <div className="side-metrics__item">
                  <span>Period</span>
                  <strong>{timePeriod}</strong>
                </div>
                <div className="side-metrics__item">
                  <span>Tracked symbols</span>
                  <strong>{stocks.trackedStocks.length}</strong>
                </div>
              </div>
            }
          />
        );
    }
  })();

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <DashboardPageHeader
          overview={dashboard.overview}
          labels={{
            eyebrow: messages.dashboard.headerEyebrow,
            lastUpdated: messages.common.lastUpdated,
            freshness: messages.common.freshness,
            destinations: messages.dashboard.destinations,
          }}
        />
      </Section>

      <Section className="dashboard-section">
        <AnalysisToolbar
          eyebrow={messages.dashboard.controlsEyebrow}
          title={messages.dashboard.controlsTitle}
          subtitle={messages.dashboard.controlsSubtitle}
          controls={
            <ChartToolbar
              pathname="/dashboard"
              chartType={chartType}
              timePeriod={timePeriod}
              labels={{
                chartType: messages.dashboard.chartType,
                timePeriod: messages.dashboard.timePeriod,
              }}
            />
          }
        />
      </Section>

      {visibleModules.includes('market-overview') ? (
        <>
          <Section className="dashboard-section">
            <header className="dashboard-section-heading">
              <div>
                <div className="section__eyebrow">{messages.dashboard.marketOverview}</div>
                <h2 className="dashboard-section-heading__title">{messages.dashboard.marketSnapshotTitle}</h2>
              </div>
            </header>
            <div className="dashboard-metric-grid">
              {dashboard.metrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>
            <div className="analytics-strip">
              <CompactStatCard
                label={messages.dashboard.trackedStocks}
                value={String(stocks.trackedStocks.length)}
                detail={messages.dashboard.trackedStocksDetail}
              />
              <CompactStatCard
                label={messages.dashboard.positiveBreadth}
                value={String(moveCounts.positive)}
                detail={messages.dashboard.positiveBreadthDetail}
                {...(positiveBreadthDelta ? { delta: positiveBreadthDelta } : {})}
              />
              <CompactStatCard
                label={messages.dashboard.negativeBreadth}
                value={String(moveCounts.negative)}
                detail={messages.dashboard.negativeBreadthDetail}
                {...(negativeBreadthDelta ? { delta: negativeBreadthDelta } : {})}
              />
              <StatComparisonCard
                title={messages.dashboard.marketSourceTitle}
                currentLabel={messages.dashboard.providerLabel}
                currentValue={stocks.metrics.find((metric) => metric.id === 'provider')?.value ?? messages.common.unavailable}
                previousLabel={messages.dashboard.quoteFreshness}
                previousValue={stocks.freshnessLabel}
                delta={{
                  value: stocks.statusLabel,
                  direction: stocks.statusTone === 'success' ? 'up' : 'flat',
                  tone: stocks.statusTone === 'success' ? 'positive' : 'neutral',
                }}
              />
            </div>
          </Section>

          <Section className="dashboard-section dashboard-section--tinted">
            <div className="analytics-main-grid">
              {marketOverviewChart}
              <div className="analytics-side-stack">
                <DistributionChartCard
                  title="Live move distribution"
                  subtitle="Current-session move clustering for the tracked stock universe."
                  buckets={liveMoveDistribution}
                />
                {stocks.insights[0] ? (
                  <InsightCallout
                    title="Live stocks are loaded into the dashboard"
                    body={stocks.insights[0]}
                  />
                ) : liveAnalytics.notes[0] ? (
                  <InsightCallout
                    title="Market data observation"
                    body={liveAnalytics.notes[0]}
                  />
                ) : null}
              </div>
            </div>
          </Section>
        </>
      ) : null}

      {visibleModules.includes('watchlist') ? (
      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">{messages.dashboard.watchlist}</div>
            <h2 className="dashboard-section-heading__title">{messages.dashboard.savedAssetsTitle}</h2>
            <p className="dashboard-section-heading__description">{messages.dashboard.simulatedDisclosure}</p>
          </div>
        </header>
        <div className="analytics-two-grid">
          {watchlistCards.length > 0 ? (
            watchlistCards.map((asset, index) => (
              <Card key={`${asset.key}-${index}`} className="analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <div className="section__eyebrow">{asset.eyebrow}</div>
                    <h3>{asset.title}</h3>
                    <p>{asset.summary}</p>
                  </div>
                </div>
                <div className="analytics-card__body">
                  <p>{asset.symbol}</p>
                  <p>{asset.priceLabel}</p>
                  <p>{asset.freshnessLabel}</p>
                </div>
              </Card>
            ))
          ) : (
            <Card className="dashboard-empty-state" tone="ghost">
              <article>
                <h3 className="dashboard-empty-state__title">{messages.dashboard.watchlist}</h3>
                <p className="dashboard-empty-state__body">{messages.dashboard.savedAssetsEmpty}</p>
              </article>
            </Card>
          )}
        </div>
      </Section>
      ) : null}

      {visibleModules.includes('forecast-analysis') ? (
      <Section className="dashboard-section dashboard-section--tinted">
        <div className="dashboard-forecast-layout">
          <section aria-labelledby="forecast-overview-heading">
            <header className="dashboard-section-heading">
              <div>
                <div className="section__eyebrow">Forecast overview</div>
                <h2 id="forecast-overview-heading" className="dashboard-section-heading__title">
                  Latest forecast previews
                </h2>
                <p className="dashboard-section-heading__description">{dashboard.forecastOverview.description}</p>
              </div>
            </header>
            {dashboard.forecastOverview.items.length > 0 ? (
              <div className="dashboard-forecast-grid">
                {dashboard.forecastOverview.items.map((forecast) => (
                  <ForecastSummaryCard key={forecast.assetId} forecast={forecast} />
                ))}
              </div>
            ) : (
              <Card className="dashboard-empty-state" tone="ghost">
                <article>
                  <h3 className="dashboard-empty-state__title">No forecast previews available</h3>
                  <p className="dashboard-empty-state__body">
                    The dashboard query is now reading through the repository boundary, but there are
                    no persisted forecast rows available for preview yet.
                  </p>
                </article>
              </Card>
            )}
          </section>

          <aside className="surface dashboard-methodology-panel" aria-labelledby="methodology-heading">
            <div className="surface__inner">
              <header className="dashboard-section-heading">
                <div>
                  <div className="section__eyebrow">Methodology</div>
                  <h2 id="methodology-heading" className="dashboard-section-heading__title">
                    Why the dashboard can be trusted
                  </h2>
                </div>
              </header>

              <div className="methodology-list">
                {dashboard.methodology.map((step) => (
                  <article key={step.id} className="methodology-list__item">
                    <div className="methodology-list__boundary">{step.boundary}</div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </Section>
      ) : null}


      {visibleModules.includes('forecast-analysis') ? (
      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid">
          <ComparisonBarPanel
            title="Relative performance spread"
            subtitle="Provider-backed short-window relative performance across the tracked stock set."
            items={liveAnalytics.relativePerformance.length > 0 ? liveAnalytics.relativePerformance : []}
          />
          <HeatmapPanel
            title="Cross-asset correlation map"
            subtitle="Rolling return correlation across the live tracked asset set."
            rows={liveAnalytics.correlationHeatmap.length > 0 ? liveAnalytics.correlationHeatmap : []}
          />
        </div>
      </Section>
      ) : null}

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Domain entry points</div>
            <h2 className="dashboard-section-heading__title">Structured access to market, analytics, and operations surfaces</h2>
          </div>
        </header>
        <div className="dashboard-module-grid">
          {dashboard.modules.map((module) => (
            <ModuleNavCard key={module.id} module={module} />
          ))}
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-two-grid analytics-two-grid--tables">
          <AnalyticsTable
            title="Latest forecasts"
            subtitle="Dense forecast table shell with sortable headers, compact density, and future row actions."
            columns={forecastTableColumns}
            rows={forecastRows}
            emptyMessage="No persisted forecasts are available yet."
            rowDetailsLabel={messages.table.rowDetails}
          />
          <AnalyticsTable
            title="Live stock snapshot"
            subtitle="Real provider-backed stock quotes loaded directly into the main interface."
            columns={localizedStockSnapshotColumns}
            rows={stockRows}
            emptyMessage={stocks.emptyStateMessage ?? 'No live stock rows are available yet.'}
            rowDetailsLabel={messages.table.rowDetails}
          />
        </div>
      </Section>

      {visibleModules.includes('broker-tools') ? (
      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">{messages.dashboard.brokerTools}</div>
            <h2 className="dashboard-section-heading__title">{messages.dashboard.simulationWorkspaceTitle}</h2>
            <p className="dashboard-section-heading__description">{messages.dashboard.simulatedDisclosure}</p>
          </div>
        </header>
        <div className="analytics-two-grid analytics-two-grid--tables">
          <AnalyticsTable
            title={messages.dashboard.latestOrders}
            subtitle={messages.dashboard.latestOrdersSubtitle}
            columns={[
              { key: 'symbol', label: messages.dashboard.stockColumn },
              { key: 'side', label: messages.dashboard.sideColumn },
              { key: 'status', label: messages.dashboard.statusColumn },
              { key: 'assetClass', label: messages.dashboard.assetClassColumn },
              { key: 'createdAt', label: messages.dashboard.createdColumn, align: 'right' },
            ]}
            rows={orders.map((order) => ({
              symbol: order.symbol,
              side: order.side,
              status: order.status,
              assetClass: order.assetClass,
              createdAt: order.createdAt,
            }))}
            emptyMessage={messages.dashboard.noOrders}
            rowDetailsLabel={messages.table.rowDetails}
          />
          <AnalyticsTable
            title={messages.simulation.transactions}
            subtitle={messages.simulation.disclosure}
            columns={[
              { key: 'type', label: messages.dashboard.typeColumn },
              { key: 'symbol', label: messages.dashboard.stockColumn },
              { key: 'cashDelta', label: messages.dashboard.cashDeltaColumn, align: 'right' },
              { key: 'createdAt', label: messages.dashboard.createdColumn, align: 'right' },
            ]}
            rows={transactions.map((transaction) => ({
              type: transaction.transactionType,
              symbol: transaction.symbol ?? 'USD',
              cashDelta: `${transaction.cashDelta > 0 ? '+' : ''}${transaction.cashDelta.toFixed(2)}`,
              createdAt: transaction.createdAt,
            }))}
            emptyMessage={messages.simulation.emptyTransactions}
            rowDetailsLabel={messages.table.rowDetails}
          />
        </div>
      </Section>
      ) : null}

      {visibleModules.includes('system-observation') ? (
      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid analytics-two-grid--tables">
          <AnalyticsTable
            title={messages.dashboard.systemObservation}
            subtitle={messages.dashboard.systemObservationSubtitle}
            columns={providerTableColumns}
            rows={providerRows}
            emptyMessage="No system observation rows are available."
            rowDetailsLabel={messages.table.rowDetails}
          />
          <SystemStatusPanel statuses={dashboard.systemStatuses} readinessNotes={dashboard.readinessNotes} />
        </div>
      </Section>
      ) : null}

      {!visibleModules.includes('system-observation') ? (
      <Section className="dashboard-section dashboard-section--tinted">
        <SystemStatusPanel statuses={dashboard.systemStatuses} readinessNotes={dashboard.readinessNotes} />
      </Section>
      ) : null}
    </>
  );
}
