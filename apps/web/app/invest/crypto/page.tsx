import Link from 'next/link';
import { getSimulationWorkspace, getUserWatchlist } from '@repo/db';
import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { MarketGraphSection } from '../../../components/charts/market-graph-section';
import { InvestableAssetCard } from '../../../components/invest/investable-asset-card';
import { MarketAssetRow } from '../../../components/invest/market-asset-row';
import { MarketViewToggle, type MarketViewMode } from '../../../components/invest/market-view-toggle';
import { QuickTradeActions } from '../../../components/invest/quick-trade-actions';
import { getMessages } from '../../../lib/i18n/messages';
import { getOptionalCurrentSession } from '../../../server/auth/session';
import { getRequestLocale } from '../../../server/i18n/locale';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice } from '../../../server/lib/quote-display';
import { getMarketGraphData } from '../../../server/services/market-graph-service';
import { getInvestOverviewData } from '../../../server/services/invest-service';
import { getSimulationSessionTradingContextForUser } from '../../../server/services/simulation-workstation-service';
import { perfLog, perfNow } from '../../../server/lib/perf';

export const dynamic = 'force-dynamic';

export default async function InvestCryptoPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; page?: string }>;
}) {
  const pageStart = perfNow();
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const params = searchParams ? await searchParams : {};
  const viewMode: MarketViewMode = params?.view === 'list' ? 'list' : 'grid';
  const page = Number.isFinite(Number(params?.page)) && Number(params?.page) > 0
    ? Math.floor(Number(params?.page))
    : 1;
  const pageSize = viewMode === 'list' ? 20 : 16;
  const [invest, graph, auth] = await Promise.all([
    getInvestOverviewData(locale, messages, {
      assetClassFilter: 'crypto',
      page,
      pageSize,
      includeHistory: true,
      historySymbolLimit: Math.max(24, pageSize),
      pageContext: 'invest-crypto-page',
    }),
    getMarketGraphData({
      assetClass: 'crypto',
      preferredSymbols: ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT'],
      limit: 8,
    }),
    getOptionalCurrentSession(),
  ]);
  perfLog('page:/invest/crypto loaders', pageStart);
  const group = invest.groupedAssets.find((item) => item.assetClass === 'crypto');
  const items = group?.items ?? [];
  const watchlist = auth ? await getUserWatchlist(auth.user.id) : [];
  const workspace = auth ? await getSimulationWorkspace(auth.user.id).catch(() => null) : null;
  const heldSymbols = new Set(
    (workspace?.positions ?? [])
      .filter((position) => position.assetClass === 'crypto' && position.quantity > 0)
      .map((position) => position.symbol),
  );
  const sessionContext = auth
    ? await getSimulationSessionTradingContextForUser(auth.user.id).catch(() => null)
    : null;
  const totalPages = Math.max(1, Math.ceil(invest.pagination.totalItems / invest.pagination.pageSize));
  const previousPageHref = `/invest/crypto?${new URLSearchParams({
    ...(viewMode === 'list' ? { view: 'list' } : {}),
    page: String(Math.max(1, invest.pagination.page - 1)),
  }).toString()}`;
  const nextPageHref = `/invest/crypto?${new URLSearchParams({
    ...(viewMode === 'list' ? { view: 'list' } : {}),
    page: String(invest.pagination.page + 1),
  }).toString()}`;
  perfLog('page:/invest/crypto total', pageStart);

  function getTradeDisabledReason(item: (typeof items)[number]) {
    if (!item.isSimulated || item.actionAvailability === 'unavailable') {
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

    if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price <= 0) {
      return `${messages.simulation.validation.freshCryptoQuoteRequired} (${item.symbol})`;
    }

    return undefined;
  }

  return (
    <>
      <MarketGraphSection graph={graph} messages={messages} />

      <Section className="dashboard-section dashboard-section--hero dashboard-section--after-market-graph">
        <WorkstationPageHeader
          eyebrow="Invest / Crypto"
          title="Crypto readiness lane"
          description="Watch major crypto assets, compare digital-asset beta, and move from research into guarded simulation execution."
          summary="Crypto simulation is enabled. Future live exchange execution remains explicitly gated behind permissions, allowlists, and readiness controls."
          statusLabel={invest.statusLabel}
          statusTone={invest.statusTone}
          meta={[
            { label: 'Coverage', value: `${group?.items.length ?? 0} assets` },
            { label: 'Action availability', value: 'Simulation enabled' },
            { label: 'Last updated', value: invest.lastUpdatedLabel },
          ]}
          actions={[
            { href: '/invest', label: 'Back to invest' },
            { href: '/dashboard', label: 'Open dashboard' },
            { href: '/invest/simulation?lane=manual_multi_asset_lane', label: 'Open multi-asset simulation' },
          ]}
        />
      </Section>
      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Crypto listings</div>
            <h2 className="dashboard-section-heading__title">Major crypto assets with simulation actions</h2>
            <p className="dashboard-section-heading__description">
              Compact cards for scanning or list rows for execution speed.
            </p>
          </div>
          <MarketViewToggle basePath="/invest/crypto" view={viewMode} />
        </header>
        <div className={viewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
          {items.map((item) => (
            (() => {
              const tradeDisabledReason = getTradeDisabledReason(item);
              const decision = invest.decisionBySymbol[item.symbol] ?? {
                signal: {
                  score: 0,
                  label: 'Neutral' as const,
                  visualState: 'insufficient-data' as const,
                  confidence: 0,
                  explanation: 'Insufficient history for signal derivation.',
                  contributingIndicators: [],
                },
                recommendation: {
                  value: 'Watch' as const,
                  confidence: 0,
                  rationale: [],
                  riskWarnings: [],
                  horizon: 'swing' as const,
                  mode: 'deterministic' as const,
                },
                risk: {
                  label: 'Medium' as const,
                  exposureImpactPercent: 0,
                  stopLossSuggestion: 0,
                  drawdownWarning: null,
                  liquidityWarning: null,
                  concentrationWarning: null,
                },
              };
              const miniChartModel = invest.miniChartModelBySymbol[item.symbol];
              const sparkline = invest.sparklineBySymbol[item.symbol] ?? [];
              return viewMode === 'grid' ? (
              <InvestableAssetCard
                key={item.assetId}
                href={`/invest/crypto/${encodeURIComponent(item.symbol)}`}
                title={item.name}
                symbol={item.symbol}
                categoryLabel={item.category}
                thesis={item.thesis}
                priceLabel={formatUsdPrice(item.price, locale, messages.common.unavailable)}
                changeLabel={formatPercentChange(item.changePercent, messages.common.partial)}
                freshnessLabel={formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable, 'crypto')}
                actionAvailability={item.actionAvailability}
                insightStance={item.insightStance}
                riskSummary={item.riskSummary}
                riskLabel={decision.risk.label}
                sparkline={sparkline}
                miniChartModel={miniChartModel}
                signal={{
                  score: decision.signal.score,
                  label: decision.signal.label,
                  confidence: decision.signal.confidence,
                  explanation: decision.signal.explanation,
                  indicators: decision.signal.contributingIndicators,
                  visualState: decision.signal.visualState,
                }}
                actions={(
                  <QuickTradeActions
                    detailHref={`/invest/crypto/${encodeURIComponent(item.symbol)}`}
                    detailLabel="Open detail"
                    assetId={item.assetId}
                    symbol={item.symbol}
                    assetClass="crypto"
                    isAuthenticated={Boolean(auth)}
                    strategyLaneId="manual_multi_asset_lane"
                    simulationSessionId={sessionContext?.sessionId ?? undefined}
                    disabled={Boolean(tradeDisabledReason)}
                    disabledReason={tradeDisabledReason}
                    showWatchlist
                    isWatched={watchlist.some((entry) => entry.assetId === item.assetId)}
                    watchlistLabelAdd={messages.dashboard.addToWatchlist}
                    watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
                    hasSimulatedPosition={heldSymbols.has(item.symbol)}
                    source="crypto-lane"
                  />
                )}
              />
            ) : (
              <MarketAssetRow
                key={item.assetId}
                symbol={item.symbol}
                title={item.name}
                category={item.category}
                thesis={item.thesis}
                priceLabel={formatUsdPrice(item.price, locale, messages.common.unavailable)}
                changeLabel={formatPercentChange(item.changePercent, messages.common.partial)}
                freshnessLabel={formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable, 'crypto')}
                actionAvailability={item.actionAvailability}
                insightStance={item.insightStance}
                sparkline={sparkline}
                miniChartModel={miniChartModel}
                signal={{
                  score: decision.signal.score,
                  label: decision.signal.label,
                  confidence: decision.signal.confidence,
                  visualState: decision.signal.visualState,
                  explanation: decision.signal.explanation,
                }}
                riskLabel={decision.risk.label}
                actions={(
                  <div className="market-row__action-grid">
                    <QuickTradeActions
                      detailHref={`/invest/crypto/${encodeURIComponent(item.symbol)}`}
                      detailLabel="Open detail"
                      assetId={item.assetId}
                      symbol={item.symbol}
                      assetClass="crypto"
                      isAuthenticated={Boolean(auth)}
                      strategyLaneId="manual_multi_asset_lane"
                      simulationSessionId={sessionContext?.sessionId ?? undefined}
                      disabled={Boolean(tradeDisabledReason)}
                      disabledReason={tradeDisabledReason}
                      showWatchlist
                      isWatched={watchlist.some((entry) => entry.assetId === item.assetId)}
                      watchlistLabelAdd={messages.dashboard.addToWatchlist}
                      watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
                      hasSimulatedPosition={heldSymbols.has(item.symbol)}
                      source="crypto-lane"
                    />
                  </div>
                )}
              />
            );
            })()
          ))}
        </div>
        {invest.pagination.totalItems > invest.pagination.pageSize ? (
          <div className="market-pagination">
            <span className="market-pagination__meta">
              Page {invest.pagination.page} of {totalPages} · {invest.pagination.totalItems} assets
            </span>
            <div className="market-pagination__actions">
              {invest.pagination.hasPreviousPage ? (
                <Link href={previousPageHref} className="button button--secondary">Previous</Link>
              ) : (
                <span className="button button--secondary" aria-disabled="true">Previous</span>
              )}
              {invest.pagination.hasNextPage ? (
                <Link href={nextPageHref} className="button button--secondary">Next</Link>
              ) : (
                <span className="button button--secondary" aria-disabled="true">Next</span>
              )}
            </div>
          </div>
        ) : null}
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-card" style={{ maxWidth: '48rem' }}>
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Crypto simulation notice</div>
              <h3>Crypto simulation context</h3>
            </div>
          </div>
          <div className="analytics-card__body">
            <p>All crypto actions on this platform are <strong>simulated only</strong> — no real capital is deployed and no orders are routed to any exchange.</p>
            <p style={{ marginTop: '0.5rem' }}>Key crypto considerations for simulation planning:</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
              <li><strong>24/7 volatility</strong> — Crypto markets operate continuously. Price moves can be extreme outside traditional market hours. Simulation captures point-in-time prices only.</li>
              <li><strong>Minimum order size</strong> — Real exchanges enforce minimum notional values and quantity precision (step size). Simulation validates these but does not route real orders.</li>
              <li><strong>Exchange and liquidity risk</strong> — Real crypto orders are subject to spread, order book depth, and exchange downtime. Simulation uses mid-price without slippage modelling.</li>
              <li><strong>Provider data delays</strong> — Crypto price feeds may lag by seconds to minutes depending on provider. Signal confidence is reduced for stale quotes.</li>
              <li><strong>No guaranteed profits</strong> — Simulation performance does not predict real trading outcomes. Crypto is highly speculative.</li>
              <li><strong>Tax and compliance obligations</strong> — Real crypto trading may trigger tax events and AML obligations. Not modelled in simulation.</li>
            </ul>
            <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Past performance is not indicative of future results. This is not financial advice. Simulation only — no real capital involved.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
