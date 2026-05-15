import { getStocksOverviewData } from '../server/services/stocks-service';
import { getMarketGraphData } from '../server/services/market-graph-service';
import { getSimulationOverviewDataForUser } from '../server/services/stock-simulation-service';
import { getOptionalCurrentSession } from '../server/auth/session';
import { HeroSection } from '../components/sections/hero-section';
import { HomeFancySections } from '../components/sections/home-fancy-sections';
import { NewsStreamWidget } from '../components/news/news-stream-widget';
import { getMessages } from '../lib/i18n/messages';
import { getRequestLocale } from '../server/i18n/locale';
import { perfLog, perfNow } from '../server/lib/perf';
import { withDbReadFallback, getHomeWidgetTimeoutMs } from '../server/lib/db-runtime';
import type { StocksOverviewViewModel } from '../server/mappers/stocks-mapper';
import { getNewsStreamData } from '../server/services/news-service';
import { getWorkspaceTrackedSymbols } from '../server/services/workspace-service';

export const dynamic = 'force-dynamic';

function buildFallbackStocks(messages: ReturnType<typeof getMessages>): StocksOverviewViewModel {
  return {
    title: 'Stocks Workstation',
    description: 'Fallback stock snapshot.',
    status: 'attention',
    freshnessState: 'stale',
    lastUpdated: null,
    freshnessSummary: 'Local fallback mode',
    sourceSummary: 'Database unavailable.',
    metrics: [{ id: 'provider', label: 'Provider state', value: 'FALLBACK', detail: 'Database unavailable.', status: 'attention', statusLabel: 'Attention', statusTone: 'warning' }],
    marketSnapshot: { advancers: 0, decliners: 0, unchanged: 0, averageMovePercent: null, strongestSymbol: null, weakestSymbol: null },
    trackedStocks: [],
    topMovers: [],
    sectorViews: [],
    forecastPreview: [],
    latestInsight: null,
    insights: [],
    emptyStateMessage: messages.common.unavailable,
    statusLabel: 'Attention',
    statusTone: 'warning',
    lastUpdatedLabel: messages.common.unavailable,
    freshnessLabel: messages.common.unavailable,
  } satisfies StocksOverviewViewModel;
}

export default async function HomePage() {
  const pageStart = perfNow();
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  // Run auth + news in parallel with the workspace symbols lookup — none depend
  // on each other. Stocks and graph are started after symbols resolve because
  // they use preferredSymbols to filter their queries.
  const [preferredSymbols, newsResult, auth] = await Promise.all([
    getWorkspaceTrackedSymbols(16),
    withDbReadFallback('home:news-stream', { items: [], providerHealth: [], updatedAt: new Date().toISOString(), degraded: true, message: 'Database unavailable — showing local fallback data.' }, () => getNewsStreamData()),
    getOptionalCurrentSession(),
  ]);
  const HOME_WIDGET_TIMEOUT_MS = getHomeWidgetTimeoutMs();
  // Start portfolio fetch concurrently — it doesn't depend on stocks/graph results.
  const portfolioPromise = auth
    ? withDbReadFallback('home:simulation-overview', null, () => getSimulationOverviewDataForUser(auth.user.id))
    : Promise.resolve({ value: null, degraded: false, reason: null as string | null });
  const [stocksResult, marketGraphResult, portfolioResult] = await Promise.all([
    withDbReadFallback('home:stocks-overview', buildFallbackStocks(messages), () =>
      getStocksOverviewData(locale, messages, {
        ...(preferredSymbols.length > 0 ? { preferredSymbols } : {}),
        preferCached: true,
      }),
      HOME_WIDGET_TIMEOUT_MS,
    ),
    withDbReadFallback('home:market-graph', { meta: { provider: 'cache', selectedTimeframe: '1D' as const, requestedResolution: '1day', actualResolution: 'unknown' as const, pointCount: 0, minAcceptablePoints: 10, isFresh: false, isFallback: false, fallbackReason: null, isDegraded: true, degradedReason: 'Database unavailable.', lastBarTimestamp: null, totalBarsInCache: 0, requestedStart: '', actualStart: null, coverageRatio: 0 }, assets: [] }, () => getMarketGraphData({
      ...(preferredSymbols.length > 0 ? { preferredSymbols } : {}),
      preferCached: true,
    }), HOME_WIDGET_TIMEOUT_MS),
    portfolioPromise,
  ]);
  const stocks = stocksResult.value;
  const marketGraph = marketGraphResult.value;
  const portfolioOverview = portfolioResult.value;
  const news = newsResult.value;
  const dbDegraded = stocksResult.degraded || marketGraphResult.degraded || portfolioResult.degraded || newsResult.degraded;
  const marketNewsEnabled = process.env.NEXT_PUBLIC_ENABLE_MARKET_NEWS !== 'false';
  perfLog('page:/ total', pageStart);

  return (
    <>
      {dbDegraded ? (
        <div className="section home-db-fallback">
          <div className="shell-container home-db-fallback__inner">
            <p className="pill">Database unavailable - showing local fallback data.</p>
          </div>
        </div>
      ) : null}
      <HeroSection
        stocks={stocks}
        marketGraph={marketGraph}
        trackedSymbols={preferredSymbols}
        newsItems={news.items}
        labels={{
          eyebrow: messages.home.heroEyebrow,
          title: messages.home.heroTitle,
          description: messages.home.heroDescription,
          openStocks: messages.home.openStocks,
          viewSimulation: messages.home.viewSimulation,
          reviewRiskLayer: messages.home.reviewRiskLayer,
          provider: messages.home.provider,
          currentSnapshotTitle: messages.home.currentSnapshotTitle,
          currentSnapshotSubtitle: messages.home.currentSnapshotSubtitle,
          liveTrackedStocks: messages.home.liveTrackedStocks,
          liveTrackedStocksCaption: messages.home.liveTrackedStocksCaption,
          positiveBreadth: messages.home.positiveBreadth,
          positiveBreadthCaption: messages.home.positiveBreadthCaption,
          topMover: messages.home.topMover,
          topMoverCaption: messages.home.topMoverCaption,
          featuredStock: messages.home.featuredStock,
          quote: messages.common.quote,
          move: messages.common.move,
          range: messages.common.historyWindow,
          historyPreviewAria: (symbol) => messages.home.historyPreviewAria.replace('{{symbol}}', symbol),
          noHistory: messages.home.noHistory,
          unavailable: messages.common.unavailable,
          platformHighlights: messages.home.platformHighlights,
          graphLabels: {
            title: messages.marketGraph.title,
            subtitle: messages.marketGraph.subtitle,
            open: messages.marketGraph.open,
            timeframe: messages.marketGraph.timeframe,
            graphType: messages.marketGraph.graphType,
            line: messages.marketGraph.line,
            candles: messages.marketGraph.candles,
            movingAverage: messages.marketGraph.movingAverage,
            signals: messages.marketGraph.signals,
            compare: messages.marketGraph.compare,
            selectAsset: messages.marketGraph.selectAsset,
            noCompare: messages.marketGraph.noCompare,
            lastPrice: messages.marketGraph.lastPrice,
            zoomIn: messages.marketGraph.zoomIn,
            zoomOut: messages.marketGraph.zoomOut,
            panLeft: messages.marketGraph.panLeft,
            panRight: messages.marketGraph.panRight,
            resetView: messages.marketGraph.resetView,
            viewport: messages.marketGraph.viewport,
            historyRange: messages.marketGraph.historyRange,
            chartAria: messages.marketGraph.chartAria,
            noData: messages.marketGraph.noData,
            intradayUnavailable: messages.marketGraph.intradayUnavailable,
            dailyFallback: messages.marketGraph.dailyFallback,
            candlesUnavailable: messages.marketGraph.candlesUnavailable,
            insufficientHistory: messages.marketGraph.insufficientHistory,
          },
        }}
      />
      <HomeFancySections
        stocks={stocks}
        marketGraph={marketGraph}
        portfolioSnapshot={portfolioOverview ? {
          portfolioValue: portfolioOverview.summary.portfolioValue,
          investedCapital: portfolioOverview.summary.investedCapital,
          unrealizedPnl: portfolioOverview.summary.unrealizedPnl,
          realizedPnl: portfolioOverview.summary.realizedPnl,
        } : null}
        labels={{
          lanes: messages.homeSections.lanes,
          capabilities: messages.homeSections.capabilities,
          modules: messages.homeSections.modules,
        }}
        common={{ unavailable: messages.common.unavailable }}
      />
      {marketNewsEnabled ? (
        <section className="dashboard-section home-news-section">
          <div className="shell-container home-news-section__inner">
            <NewsStreamWidget news={news} />
          </div>
        </section>
      ) : null}
    </>
  );
}
