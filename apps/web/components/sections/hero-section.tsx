import type { ReactNode } from 'react';
import type { StocksOverviewViewModel } from '../../server/mappers/stocks-mapper';
import type { getMarketGraphData } from '../../server/services/market-graph-service';
import type { NewsItem } from '@repo/api-contracts';
import { Card } from '../ui/card';
import { Section } from '../ui/section';
import { MarketGraphWorkspace } from '../charts/market-graph-workspace';

type HeroSectionProps = {
  stocks: StocksOverviewViewModel;
  marketGraph: Awaited<ReturnType<typeof getMarketGraphData>>;
  trackedSymbols?: string[];
  newsItems?: NewsItem[];
  /** Content rendered between the full-bleed chart band and the hero intro (the portfolio pulse). */
  betweenSlot?: ReactNode;
  labels: {
    eyebrow: string;
    title: string;
    description: string;
    openStocks: string;
    viewSimulation: string;
    reviewRiskLayer: string;
    provider: string;
    currentSnapshotTitle: string;
    currentSnapshotSubtitle: string;
    liveTrackedStocks: string;
    liveTrackedStocksCaption: string;
    positiveBreadth: string;
    positiveBreadthCaption: string;
    topMover: string;
    topMoverCaption: string;
    featuredStock: string;
    quote: string;
    move: string;
    range: string;
    historyPreviewAria: (symbol: string) => string;
    noHistory: string;
    unavailable: string;
    platformHighlights: string;
    graphLabels: {
      title: string;
      subtitle: string;
      open: string;
      timeframe: string;
      graphType: string;
      line: string;
      candles: string;
      movingAverage: string;
      signals: string;
      compare: string;
      selectAsset: string;
      noCompare: string;
      lastPrice: string;
      zoomIn: string;
      zoomOut: string;
      panLeft: string;
      panRight: string;
      resetView: string;
      viewport: string;
      historyRange: string;
      chartAria: string;
      noData: string;
      intradayUnavailable: string;
      dailyFallback: string;
      candlesUnavailable: string;
      insufficientHistory: string;
      candleIntelligence: string;
      candleIntelligenceDailyOnly: string;
      candleIntelligencePrimaryOnly: string;
    };
  };
};

export function HeroSection({ stocks, marketGraph, labels, trackedSymbols = [], newsItems = [], betweenSlot }: HeroSectionProps) {
  // The hero is now just the full-bleed chart spotlight followed by the
  // portfolio pulse (betweenSlot). The former marketing intro band (headline +
  // snapshot panel + CTAs) was removed in favour of the live data sections that
  // follow on the page.
  return (
    <>
      {marketGraph.assets.length > 0 ? (
        <Section className="section--hero hero-chart-section">
          <Card className="hero-graph-card">
            <MarketGraphWorkspace
              variant="spotlight"
              assets={marketGraph.assets}
              trackedSymbols={trackedSymbols}
              newsItems={newsItems}
              defaultSymbol="AMD"
              defaultCompareSymbol="NVDA"
              defaultTimeframe="3M"
              defaultGraphType="candles"
              defaultCandleIntelligence
              labels={{
                timeframe: labels.graphLabels.timeframe,
                graphType: labels.graphLabels.graphType,
                line: labels.graphLabels.line,
                candles: labels.graphLabels.candles,
                movingAverage: labels.graphLabels.movingAverage,
                signals: labels.graphLabels.signals,
                compare: labels.graphLabels.compare,
                selectAsset: labels.graphLabels.selectAsset,
                noCompare: labels.graphLabels.noCompare,
                lastPrice: labels.graphLabels.lastPrice,
                zoomIn: labels.graphLabels.zoomIn,
                zoomOut: labels.graphLabels.zoomOut,
                panLeft: labels.graphLabels.panLeft,
                panRight: labels.graphLabels.panRight,
                resetView: labels.graphLabels.resetView,
                viewport: labels.graphLabels.viewport,
                historyRange: labels.graphLabels.historyRange,
                chartAriaTemplate: labels.graphLabels.chartAria,
                noData: labels.graphLabels.noData,
                unavailable: labels.unavailable,
                intradayUnavailable: labels.graphLabels.intradayUnavailable,
                dailyFallback: labels.graphLabels.dailyFallback,
                candlesUnavailable: labels.graphLabels.candlesUnavailable,
                insufficientHistory: labels.graphLabels.insufficientHistory,
                candleIntelligence: labels.graphLabels.candleIntelligence,
                candleIntelligenceDailyOnly: labels.graphLabels.candleIntelligenceDailyOnly,
                candleIntelligencePrimaryOnly: labels.graphLabels.candleIntelligencePrimaryOnly,
              }}
            />
          </Card>
        </Section>
      ) : null}

      {betweenSlot}
    </>
  );
}
