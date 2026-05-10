import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailSlotCard } from '../../../../components/asset/detail-slot-card';
import { WorkstationPageHeader } from '../../../../components/asset/workstation-page-header';
import { PriceHistoryPanel } from '../../../../components/charts/price-history-panel';
import { CompactStatCard } from '../../../../components/stats/compact-stat-card';
import { Section } from '../../../../components/ui/section';
import { Card } from '../../../../components/ui/card';
import { SimulatedOrderForm, WatchlistToggleForm } from '../../../../components/invest/simulation-action-form';
import { SignalSummary } from '../../../../components/signals/signal-summary';
import { TradeRiskOverlay } from '../../../../components/invest/trade-risk-overlay';
import { getMessages } from '../../../../lib/i18n/messages';
import { formatDateTimeLabel, formatShortDateLabel } from '../../../../lib/formatters';
import { getRequestLocale } from '../../../../server/i18n/locale';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice, getQuoteTimestamp } from '../../../../server/lib/quote-display';
import { getOptionalCurrentSession } from '../../../../server/auth/session';
import { getInvestableAssetDetailPageData } from '../../../../server/services/stock-simulation-service';
import { getSimulationSessionTradingContextForUser } from '../../../../server/services/simulation-workstation-service';
import { deriveAssetDecisionIntelligence } from '../../../../server/services/decision-intelligence-service';

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
  const decision = deriveAssetDecisionIntelligence({
    symbol: asset.asset.symbol,
    assetClass: 'crypto',
    history: asset.history.map((point) => point.close),
    latestPrice: asset.quote?.price ?? null,
    dayMovePercent: asset.quote?.changePercent ?? null,
    quantity: asset.position?.quantity ?? 1,
    portfolioValue: asset.position?.marketValue ? Math.max(asset.position.marketValue * 4, 10000) : 100000,
    existingExposure: asset.position?.marketValue ?? 0,
  });

  const auth = await getOptionalCurrentSession();
  const sessionContext = auth
    ? await getSimulationSessionTradingContextForUser(auth.user.id).catch(() => null)
    : null;
  const isSimulationTradable =
    asset.asset.isSimulated &&
    asset.asset.isTradable &&
    asset.asset.actionAvailability !== 'unavailable';
  const disabledReason = (() => {
    if (!isSimulationTradable) {
      return 'Simulation trading for this asset is not active yet.';
    }

    if (!sessionContext || !sessionContext.sessionId) {
      return 'Start the manual multi-asset simulation lane to place crypto simulation orders.';
    }

    if (sessionContext.isReadOnly) {
      return sessionContext.statusMessage;
    }

    if (sessionContext.laneId !== 'manual_multi_asset_lane') {
      return 'Switch to the manual multi-asset lane to simulate crypto orders.';
    }

    if (sessionContext.assetScope !== 'multi-asset' && sessionContext.assetScope !== 'crypto') {
      return `The active session is scoped to ${sessionContext.assetScope?.toUpperCase() ?? 'another asset class'} assets.`;
    }

    if (!hasQuotePrice) {
      return `${messages.simulation.validation.freshCryptoQuoteRequired} (${asset.asset.symbol})`;
    }

    return undefined;
  })();
  const tradingDisabled = Boolean(disabledReason);

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
          <CompactStatCard label="Signal" value={`${decision.signal.label} (${decision.signal.score.toFixed(2)})`} detail={`Confidence ${(decision.signal.confidence * 100).toFixed(0)}%`} />
          <CompactStatCard label="Risk" value={decision.risk.label} detail={`Exposure impact ${decision.risk.exposureImpactPercent.toFixed(2)}%`} />
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
                <SignalSummary
                  score={decision.signal.score}
                  label={decision.signal.label}
                  confidence={decision.signal.confidence}
                  explanation={decision.signal.explanation}
                  indicators={decision.signal.contributingIndicators}
                  visualState={decision.signal.visualState}
                />
              </div>
              <div className="analytics-card__action-grid">
                <WatchlistToggleForm
                  assetId={asset.asset.assetId}
                  symbol={asset.asset.symbol}
                  assetClass="crypto"
                  active={asset.isWatched}
                  label={asset.isWatched ? messages.dashboard.removeFromWatchlist : messages.dashboard.addToWatchlist}
                />
                <SimulatedOrderForm assetId={asset.asset.assetId} symbol={asset.asset.symbol} assetClass="crypto" side="buy" strategyLaneId="manual_multi_asset_lane" simulationSessionId={sessionContext?.sessionId ?? undefined} label={messages.dashboard.buySimulated} showQuantityInput quantityLabel={messages.simulation.quantity} disabled={tradingDisabled} disabledReason={disabledReason} currentPrice={asset.quote?.price ?? null} currentHeldQuantity={asset.position?.quantity ?? 0} sourceContext="crypto-lane" uiText={{ quantityMode: messages.simulation.quantity, notionalMode: 'Notional', notionalAmount: 'Notional amount', quantityRequired: messages.simulation.validation.quantityRequired, minimumShare: messages.simulation.validation.minimumShare, minimumUnit: messages.simulation.validation.minimumUnit, minimumQuantity: (value) => messages.simulation.validation.minimumQuantity.replace('{{value}}', String(value)), wholeSharesOnly: messages.simulation.validation.wholeSharesOnly, quantityStepMismatch: (step) => messages.simulation.validation.quantityStepMismatch.replace('{{step}}', String(step)), minimumNotional: messages.simulation.validation.minimumNotional, noOpenPositionToSell: (s) => messages.simulation.validation.noOpenPositionToSell.replace('{{symbol}}', s), closePosition: messages.simulation.chips.closePosition }} />
                <SimulatedOrderForm assetId={asset.asset.assetId} symbol={asset.asset.symbol} assetClass="crypto" side="sell" strategyLaneId="manual_multi_asset_lane" simulationSessionId={sessionContext?.sessionId ?? undefined} label={messages.dashboard.sellSimulated} showQuantityInput quantityLabel={messages.simulation.quantity} disabled={tradingDisabled || !asset.position || asset.position.quantity <= 0} disabledReason={!asset.position || asset.position.quantity <= 0 ? messages.simulation.validation.noOpenPositionToSell.replace('{{symbol}}', asset.asset.symbol) : disabledReason} currentPrice={asset.quote?.price ?? null} currentHeldQuantity={asset.position?.quantity ?? 0} sourceContext="crypto-lane" uiText={{ quantityMode: messages.simulation.quantity, notionalMode: 'Notional', notionalAmount: 'Notional amount', quantityRequired: messages.simulation.validation.quantityRequired, minimumShare: messages.simulation.validation.minimumShare, minimumUnit: messages.simulation.validation.minimumUnit, minimumQuantity: (value) => messages.simulation.validation.minimumQuantity.replace('{{value}}', String(value)), wholeSharesOnly: messages.simulation.validation.wholeSharesOnly, quantityStepMismatch: (step) => messages.simulation.validation.quantityStepMismatch.replace('{{step}}', String(step)), minimumNotional: messages.simulation.validation.minimumNotional, noOpenPositionToSell: (s) => messages.simulation.validation.noOpenPositionToSell.replace('{{symbol}}', s), closePosition: messages.simulation.chips.closePosition }} />
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
            <TradeRiskOverlay
              maxPositionSizeSuggestion={Math.max(asset.position?.marketValue ?? 0, 5000)}
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
