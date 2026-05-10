import { MarketGraphWorkspace } from './market-graph-workspace';
import type { AppMessages } from '../../lib/i18n/messages';
import type { getMarketGraphData } from '../../server/services/market-graph-service';

type MarketGraphSectionProps = {
  graph: Awaited<ReturnType<typeof getMarketGraphData>>;
  messages: AppMessages;
  className?: string;
  trackedSymbols?: string[];
  newsItems?: Array<{
    id: string;
    title: string;
    url: string | null;
    source: string | null;
    summary: string | null;
    publishedAt: string;
    symbol: string | null;
    tickers?: string[];
  }>;
};

export function MarketGraphSection({ graph, messages, className, trackedSymbols = [], newsItems = [] }: MarketGraphSectionProps) {
  const sectionClassName = className ? `market-graph-section ${className}` : 'market-graph-section';

  return (
    <section className={sectionClassName}>
      <MarketGraphWorkspace
        assets={graph.assets}
        meta={graph.meta}
        trackedSymbols={trackedSymbols}
        newsItems={newsItems}
        labels={{
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
          chartAriaTemplate: messages.marketGraph.chartAria,
          noData: messages.marketGraph.noData,
          unavailable: messages.common.unavailable,
          intradayUnavailable: messages.marketGraph.intradayUnavailable,
          dailyFallback: messages.marketGraph.dailyFallback,
          candlesUnavailable: messages.marketGraph.candlesUnavailable,
          insufficientHistory: messages.marketGraph.insufficientHistory,
        }}
      />
    </section>
  );
}
