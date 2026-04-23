import Link from 'next/link';
import type { StocksOverviewViewModel } from '../../server/mappers/stocks-mapper';
import type { getMarketGraphData } from '../../server/services/market-graph-service';
import { Card } from '../ui/card';
import { Section } from '../ui/section';
import { StatusBadge } from '../ui/status-badge';
import { MarketGraphWorkspace } from '../charts/market-graph-workspace';

type HeroSectionProps = {
  stocks: StocksOverviewViewModel;
  featuredSymbol: string | null;
  marketGraph: Awaited<ReturnType<typeof getMarketGraphData>>;
  labels: {
    eyebrow: string;
    title: string;
    description: string;
    openStocks: string;
    marketGraph: string;
    openDashboard: string;
    reviewAsset: (symbol: string) => string;
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
    };
  };
};

export function HeroSection({ stocks, featuredSymbol, marketGraph, labels }: HeroSectionProps) {
  const positiveBreadth = stocks.trackedStocks.length > 0 ? Math.round((stocks.trackedStocks.filter((item) => (item.changePercent ?? 0) > 0).length / stocks.trackedStocks.length) * 100) : 0;
  const featuredMove = stocks.topMovers[0];
  const metrics = [
    {
      label: labels.liveTrackedStocks,
      value: String(stocks.trackedStocks.length),
      caption: labels.liveTrackedStocksCaption,
    },
    {
      label: labels.positiveBreadth,
      value: `${positiveBreadth}%`,
      caption: labels.positiveBreadthCaption,
    },
    {
      label: labels.topMover,
      value: featuredMove ? `${featuredMove.symbol} ${featuredMove.changeLabel}` : labels.unavailable,
      caption: labels.topMoverCaption,
    },
  ] as const;

  return (
    <Section className="section section--hero">
      <div className="hero">
        <article className="hero__content">
          <div className="section__eyebrow">{labels.eyebrow}</div>
          <h1>{labels.title}</h1>
          <p className="hero__lede">{labels.description}</p>

          <div className="hero__actions">
            <Link href="/stocks" className="button button--primary">
              {labels.openStocks}
            </Link>
            <Link href="/market" className="button button--secondary">
              {labels.marketGraph}
            </Link>
            <Link href={featuredSymbol ? `/stocks/${featuredSymbol}` : '/dashboard'} className="button button--secondary">
              {featuredSymbol ? labels.reviewAsset(featuredSymbol) : labels.openDashboard}
            </Link>
          </div>

          <div className="hero__meta" aria-label={labels.platformHighlights}>
            <span className="pill">{stocks.freshnessSummary}</span>
            <span className="pill">{labels.provider}: {stocks.metrics.find((metric) => metric.id === 'provider')?.value ?? labels.unavailable}</span>
            <span className="pill">{stocks.lastUpdatedLabel}</span>
          </div>
        </article>

        {marketGraph.assets.length > 0 ? (
          <Card className="hero-graph-card">
            <MarketGraphWorkspace
              variant="spotlight"
              assets={marketGraph.assets}
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
              }}
            />
          </Card>
        ) : null}

        <Card tone="accent" className="hero-panel">
          <div className="hero-panel__header">
            <div>
              <h2 className="hero-panel__title">{labels.currentSnapshotTitle}</h2>
              <p className="hero-panel__subtext">{labels.currentSnapshotSubtitle}</p>
            </div>
            <StatusBadge tone={stocks.statusTone}>{stocks.statusLabel}</StatusBadge>
          </div>

          <div className="metric-stack">
            {metrics.map((metric) => (
              <article key={metric.label} className="metric-card">
                <div className="metric-card__label">{metric.label}</div>
                <div className="metric-card__value">{metric.value}</div>
                <p className="metric-card__caption">{metric.caption}</p>
              </article>
            ))}
          </div>

        </Card>
      </div>
    </Section>
  );
}
