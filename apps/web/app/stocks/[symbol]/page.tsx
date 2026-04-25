import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailSlotCard } from '../../../components/asset/detail-slot-card';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { PriceHistoryPanel } from '../../../components/charts/price-history-panel';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import { Section } from '../../../components/ui/section';
import { Card } from '../../../components/ui/card';
import { SimulatedOrderForm, WatchlistToggleForm } from '../../../components/invest/simulation-action-form';
import { SignalSummary } from '../../../components/signals/signal-summary';
import { TradeRiskOverlay } from '../../../components/invest/trade-risk-overlay';
import { getMessages } from '../../../lib/i18n/messages';
import { formatDateTimeLabel, formatShortDateLabel } from '../../../lib/formatters';
import { getRequestLocale } from '../../../server/i18n/locale';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice, getQuoteTimestamp } from '../../../server/lib/quote-display';
import { getStockDetailPageData } from '../../../server/services/stock-simulation-service';
import { deriveAssetDecisionIntelligence } from '../../../server/services/decision-intelligence-service';

export const dynamic = 'force-dynamic';

type StockDetailPageProps = {
  params: Promise<{
    symbol: string;
  }>;
};

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { symbol } = await params;
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const stock = await getStockDetailPageData(symbol);
  const quoteTimestamp = getQuoteTimestamp(stock?.quote);
  const hasQuotePrice = typeof stock?.quote?.price === 'number' && Number.isFinite(stock.quote.price);

  if (!stock) {
    notFound();
  }
  const decision = deriveAssetDecisionIntelligence({
    symbol: stock.asset.symbol,
    assetClass: 'stock',
    history: stock.history.map((point) => point.close),
    latestPrice: stock.quote?.price ?? null,
    dayMovePercent: stock.quote?.changePercent ?? null,
    quantity: stock.position?.quantity ?? 1,
    portfolioValue: stock.position?.marketValue ? Math.max(stock.position.marketValue * 4, 10000) : 100000,
    existingExposure: stock.position?.marketValue ?? 0,
  });

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Stock detail"
          title={`${stock.asset.symbol} simulation workspace`}
          description={stock.asset.name}
          summary={messages.common.simulationDisclosure}
          statusLabel={hasQuotePrice ? messages.status.nominal : messages.status.attention}
          statusTone={hasQuotePrice ? 'success' : 'warning'}
          meta={[
            { label: messages.common.lastUpdated, value: quoteTimestamp ? formatDateTimeLabel(quoteTimestamp, locale) : messages.common.unavailable },
            { label: messages.common.quote, value: formatUsdPrice(stock.quote?.price ?? null, locale, messages.common.unavailable) },
            { label: messages.common.move, value: formatPercentChange(stock.quote?.changePercent ?? null, messages.common.partial) },
          ]}
          actions={[
            { href: '/stocks', label: 'Back to stocks' },
            { href: '/invest/simulation', label: messages.simulation.navLabel },
            { href: '/dashboard', label: messages.shell.nav.dashboard },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label={messages.common.currentQuote} value={formatUsdPrice(stock.quote?.price ?? null, locale, messages.common.unavailable)} detail="Latest cached or live quote available for this stock." />
          <CompactStatCard label={messages.common.dailyMove} value={formatPercentChange(stock.quote?.changePercent ?? null, messages.common.partial)} detail="Current day-over-day move from the most recent quote." />
          <CompactStatCard label="Signal" value={`${decision.signal.label} (${decision.signal.score.toFixed(2)})`} detail={`Confidence ${(decision.signal.confidence * 100).toFixed(0)}%`} />
          <CompactStatCard label="Risk" value={decision.risk.label} detail={`Exposure impact ${decision.risk.exposureImpactPercent.toFixed(2)}%`} />
          <CompactStatCard label="Tradability" value={stock.asset.isTradable ? 'Paper tradable' : 'Browse only'} detail="This launch supports simulation trading for stocks only." />
          <CompactStatCard label="Position" value={stock.position ? `${stock.position.quantity.toFixed(4)} shares` : 'No holding'} detail="Current holding context for the signed-in simulation account." />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-main-grid">
          <PriceHistoryPanel
            title="Price history"
            subtitle="Daily bars rendered from the cached market-data store."
            points={stock.history.map((point) => ({
              label: formatShortDateLabel(point.timestamp, locale),
              timestamp: point.timestamp,
              open: point.open,
              high: point.high,
              low: point.low,
              close: point.close,
              volume: point.volume,
            }))}
            note="Historical data is provider-backed and cached for reuse across the product."
            emptyMessage={messages.stocks.historyUnavailable}
            rail={
              <div className="side-metrics">
                <div className="side-metrics__item">
                  <span>Source</span>
                  <strong>{stock.quote?.source ?? messages.common.unavailable}</strong>
                </div>
                <div className="side-metrics__item">
                  <span>Bars</span>
                  <strong>{String(stock.history.length)}</strong>
                </div>
                <div className="side-metrics__item">
                  <span>Freshness</span>
                  <strong>{formatFreshnessLabel(quoteTimestamp, locale, messages.common.unavailable)}</strong>
                </div>
              </div>
            }
          />
          <div className="analytics-side-stack">
            <Card className="analytics-card">
              <div className="analytics-card__header">
                <div>
                  <div className="section__eyebrow">Simulation actions</div>
                  <h3>Buy, sell, and watch</h3>
                  <p>{messages.common.simulationDisclosure}</p>
                </div>
              </div>
              <div className="analytics-card__body">
                <p>{stock.asset.thesis}</p>
                <p>{stock.asset.riskSummary}</p>
                <SignalSummary
                  score={decision.signal.score}
                  label={decision.signal.label}
                  confidence={decision.signal.confidence}
                  explanation={decision.signal.explanation}
                  indicators={decision.signal.contributingIndicators}
                  visualState={decision.signal.visualState}
                />
                {stock.position ? (
                  <p>
                    Current holding: {stock.position.quantity.toFixed(4)} shares at an average cost of {formatUsdPrice(stock.position.averageCost, locale, messages.common.unavailable)}.
                  </p>
                ) : (
                  <p>No shares are currently held in the paper portfolio.</p>
                )}
              </div>
              <div className="analytics-card__action-grid">
                <WatchlistToggleForm
                  assetId={stock.asset.assetId}
                  symbol={stock.asset.symbol}
                  assetClass="stock"
                  active={stock.isWatched}
                  label={stock.isWatched ? messages.dashboard.removeFromWatchlist : messages.dashboard.addToWatchlist}
                />
                <SimulatedOrderForm assetId={stock.asset.assetId} symbol={stock.asset.symbol} assetClass="stock" side="buy" label={messages.dashboard.buySimulated} showQuantityInput quantityLabel={messages.simulation.quantity} />
                <SimulatedOrderForm assetId={stock.asset.assetId} symbol={stock.asset.symbol} assetClass="stock" side="sell" label={messages.dashboard.sellSimulated} showQuantityInput quantityLabel={messages.simulation.quantity} />
              </div>
            </Card>
            <DetailSlotCard
              eyebrow="Stock profile"
              title="Why this stock is in the launch universe"
              description="The current stock catalog is intentionally curated so the simulation product stays coherent, testable, and trustworthy."
              items={[
                `Category: ${stock.asset.category}`,
                `Sector: ${stock.asset.sector ?? 'Unclassified'}`,
                `Geography: ${stock.asset.geography ?? 'Unavailable'}`,
                `Quote source: ${stock.quote?.source ?? messages.common.unavailable}`,
              ]}
            />
            <TradeRiskOverlay
              maxPositionSizeSuggestion={Math.max(stock.position?.marketValue ?? 0, 5000)}
              estimatedVolatility={Math.max(0.001, decision.risk.exposureImpactPercent / 100)}
              drawdownWarning={decision.risk.drawdownWarning}
              liquidityWarning={decision.risk.liquidityWarning}
              stopLossSuggestion={decision.risk.stopLossSuggestion}
              exposureImpactPercent={decision.risk.exposureImpactPercent}
              concentrationWarning={decision.risk.concentrationWarning}
              riskLevel={decision.risk.label}
            />
          </div>
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-two-grid">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Holding context</div>
                <h3>Portfolio impact</h3>
                <p>Signed-in users see their live-marked holding context directly on the stock detail page.</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <p>Market value: {formatUsdPrice(stock.position?.marketValue ?? null, locale, messages.common.unavailable)}</p>
              <p>Unrealized P&amp;L: {stock.position ? formatUsdPrice(stock.position.unrealizedPnl, locale, messages.common.unavailable) : messages.common.none}</p>
              <p>Watchlist: {stock.isWatched ? 'Saved' : 'Not saved'}</p>
            </div>
          </Card>
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Next steps</div>
                <h3>Move from research to simulation</h3>
                <p>Use the stock workspace to compare names, then come back here for chart review and paper-trade execution.</p>
              </div>
            </div>
            <div className="analytics-card__action-grid">
              <Link href="/stocks" className="button button--secondary">
                Browse more stocks
              </Link>
              <Link href="/invest/simulation" className="button button--secondary">
                Open paper portfolio
              </Link>
            </div>
          </Card>
        </div>
      </Section>
    </>
  );
}
