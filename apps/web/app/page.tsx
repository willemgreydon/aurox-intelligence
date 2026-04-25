import { getStocksOverviewData } from '../server/services/stocks-service';
import { getMarketGraphData } from '../server/services/market-graph-service';
import { getSimulationOverviewDataForUser } from '../server/services/stock-simulation-service';
import { getOptionalCurrentSession } from '../server/auth/session';
import { HeroSection } from '../components/sections/hero-section';
import { HomeFancySections } from '../components/sections/home-fancy-sections';
import { getMessages } from '../lib/i18n/messages';
import { getRequestLocale } from '../server/i18n/locale';
import { perfLog, perfNow } from '../server/lib/perf';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const pageStart = perfNow();
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const [stocks, marketGraph, auth] = await Promise.all([
    getStocksOverviewData(locale, messages),
    getMarketGraphData(),
    getOptionalCurrentSession(),
  ]);
  const portfolioOverview = auth
    ? await getSimulationOverviewDataForUser(auth.user.id).catch(() => null)
    : null;
  perfLog('page:/ total', pageStart);

  return (
    <>
      <HeroSection
        stocks={stocks}
        marketGraph={marketGraph}
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
    </>
  );
}
