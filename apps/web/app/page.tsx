import { getStockDetailData, getStocksOverviewData } from '../server/services/stocks-service';
import { getMarketGraphData } from '../server/services/market-graph-service';
import { HeroSection } from '../components/sections/hero-section';
import { CapabilitiesSection } from '../components/sections/capabilities-section';
import { ModulesSection } from '../components/sections/modules-section';
import { ExplainabilitySection } from '../components/sections/explainability-section';
import { SystemStatusSection } from '../components/sections/system-status-section';
import { getMessages } from '../lib/i18n/messages';
import { getRequestLocale } from '../server/i18n/locale';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const [stocks, marketGraph] = await Promise.all([
    getStocksOverviewData(locale, messages),
    getMarketGraphData(),
  ]);
  const featuredSymbol = stocks.topMovers[0]?.symbol ?? stocks.trackedStocks[0]?.symbol ?? null;
  const featuredStock = featuredSymbol ? await getStockDetailData(featuredSymbol, locale, messages) : null;

  return (
    <>
      <HeroSection
        stocks={stocks}
        featuredStock={featuredStock}
        marketGraph={marketGraph}
        labels={{
          eyebrow: messages.home.heroEyebrow,
          title: messages.home.heroTitle,
          description: messages.home.heroDescription,
          openStocks: messages.home.openStocks,
          marketGraph: messages.marketGraph.open,
          openDashboard: messages.home.openDashboard,
          reviewAsset: (symbol) => messages.home.reviewAsset.replace('{{symbol}}', symbol),
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
      <CapabilitiesSection labels={messages.homeSections.capabilities} />
      <ModulesSection labels={messages.homeSections.modules} />
      <ExplainabilitySection labels={messages.homeSections.explainability} />
      <SystemStatusSection labels={messages.homeSections.systemStatus} />
    </>
  );
}
