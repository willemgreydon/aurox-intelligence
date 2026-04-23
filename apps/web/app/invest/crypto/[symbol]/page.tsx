import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailSlotCard } from '../../../../components/asset/detail-slot-card';
import { WorkstationPageHeader } from '../../../../components/asset/workstation-page-header';
import { PriceHistoryPanel } from '../../../../components/charts/price-history-panel';
import { CompactStatCard } from '../../../../components/stats/compact-stat-card';
import { Section } from '../../../../components/ui/section';
import { Card } from '../../../../components/ui/card';
import { SimulatedOrderForm, WatchlistToggleForm } from '../../../../components/invest/simulation-action-form';
import { getMessages } from '../../../../lib/i18n/messages';
import { formatDateTimeLabel, formatShortDateLabel } from '../../../../lib/formatters';
import { getRequestLocale } from '../../../../server/i18n/locale';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice, getQuoteTimestamp } from '../../../../server/lib/quote-display';
import { getInvestableAssetDetailPageData } from '../../../../server/services/stock-simulation-service';

export const dynamic = 'force-dynamic';

type CryptoDetailPageProps = {
  params: Promise<{
    symbol: string;
  }>;
};

export default async function CryptoDetailPage({ params }: CryptoDetailPageProps) {
  const { symbol } = await params;
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const asset = await getInvestableAssetDetailPageData(symbol, 'crypto');
  const quoteTimestamp = getQuoteTimestamp(asset?.quote);
  const hasQuotePrice = typeof asset?.quote?.price === 'number' && Number.isFinite(asset.quote.price);

  if (!asset) {
    notFound();
  }

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Crypto detail"
          title={`${asset.asset.symbol} digital-asset lane`}
          description={asset.asset.name}
          summary={messages.common.simulationDisclosure}
          statusLabel={hasQuotePrice ? messages.status.nominal : messages.status.attention}
          statusTone={hasQuotePrice ? 'success' : 'warning'}
          meta={[
            { label: messages.common.lastUpdated, value: quoteTimestamp ? formatDateTimeLabel(quoteTimestamp, locale) : messages.common.unavailable },
            { label: messages.common.quote, value: formatUsdPrice(asset.quote?.price ?? null, locale, messages.common.unavailable) },
            { label: messages.common.move, value: formatPercentChange(asset.quote?.changePercent ?? null, messages.common.partial) },
          ]}
          actions={[
            { href: '/invest/crypto', label: 'Back to crypto' },
            { href: '/invest/simulation?lane=manual_multi_asset_lane', label: messages.simulation.navLabel },
            { href: '/dashboard', label: messages.shell.nav.dashboard },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label={messages.common.currentQuote} value={formatUsdPrice(asset.quote?.price ?? null, locale, messages.common.unavailable)} detail="Latest cached or live quote available for this crypto asset." />
          <CompactStatCard label={messages.common.dailyMove} value={formatPercentChange(asset.quote?.changePercent ?? null, messages.common.partial)} detail="Current move from the most recent quote." />
          <CompactStatCard label="Tradability" value={asset.asset.isTradable ? 'Paper tradable' : 'Browse only'} detail="Crypto simulation is supported in manual multi-asset lanes." />
          <CompactStatCard label="Position" value={asset.position ? `${asset.position.quantity.toFixed(4)} units` : 'No holding'} detail="Current holding context for the signed-in simulation account." />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-main-grid">
          <PriceHistoryPanel
            title="Price history"
            subtitle="Daily bars rendered from the cached market-data store."
            points={asset.history.map((point) => ({
              label: formatShortDateLabel(point.timestamp, locale),
              timestamp: point.timestamp,
              open: point.open,
              high: point.high,
              low: point.low,
              close: point.close,
              volume: point.volume,
            }))}
            note="Historical data is provider-backed and cached for reuse across the product."
            emptyMessage={messages.marketGraph.noData}
            rail={
              <div className="side-metrics">
                <div className="side-metrics__item">
                  <span>Source</span>
                  <strong>{asset.quote?.source ?? messages.common.unavailable}</strong>
                </div>
                <div className="side-metrics__item">
                  <span>Bars</span>
                  <strong>{String(asset.history.length)}</strong>
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
                <p>{asset.asset.thesis}</p>
                <p>{asset.asset.riskSummary}</p>
              </div>
              <div className="analytics-card__action-grid">
                <WatchlistToggleForm
                  assetId={asset.asset.assetId}
                  symbol={asset.asset.symbol}
                  assetClass="crypto"
                  active={asset.isWatched}
                  label={asset.isWatched ? messages.dashboard.removeFromWatchlist : messages.dashboard.addToWatchlist}
                />
                <SimulatedOrderForm assetId={asset.asset.assetId} symbol={asset.asset.symbol} assetClass="crypto" side="buy" strategyLaneId="manual_multi_asset_lane" label={messages.dashboard.buySimulated} showQuantityInput quantityLabel={messages.simulation.quantity} />
                <SimulatedOrderForm assetId={asset.asset.assetId} symbol={asset.asset.symbol} assetClass="crypto" side="sell" strategyLaneId="manual_multi_asset_lane" label={messages.dashboard.sellSimulated} showQuantityInput quantityLabel={messages.simulation.quantity} />
              </div>
            </Card>
            <DetailSlotCard
              eyebrow="Crypto profile"
              title="Asset and risk context"
              description="Crypto detail lanes keep quote, history, and simulation safety controls in one place."
              items={[
                `Category: ${asset.asset.category}`,
                `Quote source: ${asset.quote?.source ?? messages.common.unavailable}`,
                `Watchlist: ${asset.isWatched ? 'Saved' : 'Not saved'}`,
              ]}
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
                <p>Signed-in users see live-marked holding context directly on the crypto detail page.</p>
              </div>
            </div>
            <div className="analytics-card__body">
              <p>Market value: {formatUsdPrice(asset.position?.marketValue ?? null, locale, messages.common.unavailable)}</p>
              <p>Unrealized P&amp;L: {asset.position ? formatUsdPrice(asset.position.unrealizedPnl, locale, messages.common.unavailable) : messages.common.none}</p>
              <p>Watchlist: {asset.isWatched ? 'Saved' : 'Not saved'}</p>
            </div>
          </Card>
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Next steps</div>
                <h3>Continue crypto workflow</h3>
                <p>Compare digital-asset context in lane view, then place simulation orders with lane safety gates.</p>
              </div>
            </div>
            <div className="analytics-card__action-grid">
              <Link href="/invest/crypto" className="button button--secondary">
                Browse more crypto
              </Link>
              <Link href="/invest/simulation?lane=manual_multi_asset_lane" className="button button--secondary">
                Open paper portfolio
              </Link>
            </div>
          </Card>
        </div>
      </Section>
    </>
  );
}
