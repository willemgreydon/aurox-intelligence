import Link from 'next/link';
import { getUserWatchlist } from '@repo/db';
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

export default async function InvestEtfsPage({
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
      assetClassFilter: 'etf',
      page,
      pageSize,
      includeHistory: true,
      historySymbolLimit: Math.max(24, pageSize),
      pageContext: 'invest-etfs-page',
    }),
    getMarketGraphData({
      assetClass: 'etf',
      preferredSymbols: ['SPY', 'QQQ', 'VTI', 'IWM', 'TLT'],
      limit: 10,
    }),
    getOptionalCurrentSession(),
  ]);
  perfLog('page:/invest/etfs loaders', pageStart);
  const group = invest.groupedAssets.find((item) => item.assetClass === 'etf');
  const items = group?.items ?? [];
  const watchlist = auth ? await getUserWatchlist(auth.user.id) : [];
  const sessionContext = auth
    ? await getSimulationSessionTradingContextForUser(auth.user.id).catch(() => null)
    : null;
  const totalPages = Math.max(1, Math.ceil(invest.pagination.totalItems / invest.pagination.pageSize));
  const previousPageHref = `/invest/etfs?${new URLSearchParams({
    ...(viewMode === 'list' ? { view: 'list' } : {}),
    page: String(Math.max(1, invest.pagination.page - 1)),
  }).toString()}`;
  const nextPageHref = `/invest/etfs?${new URLSearchParams({
    ...(viewMode === 'list' ? { view: 'list' } : {}),
    page: String(invest.pagination.page + 1),
  }).toString()}`;
  perfLog('page:/invest/etfs total', pageStart);

  function getTradeDisabledReason(item: (typeof items)[number]) {
    if (!item.isSimulated || item.actionAvailability === 'unavailable') {
      return 'Simulation trading for this asset is not active yet.';
    }

    if (!sessionContext || !sessionContext.sessionId) {
      return 'Start the manual multi-asset simulation lane to place ETF simulation orders.';
    }

    if (sessionContext.isReadOnly) {
      return sessionContext.statusMessage;
    }

    if (sessionContext.laneId !== 'manual_multi_asset_lane') {
      return 'Switch to the manual multi-asset lane to simulate ETF orders.';
    }

    if (sessionContext.assetScope !== 'multi-asset' && sessionContext.assetScope !== 'etf') {
      return `The active session is scoped to ${sessionContext.assetScope?.toUpperCase() ?? 'another asset class'} assets.`;
    }

    if (!item.lastUpdatedAt) {
      return `Fresh ETF quote required for ${item.symbol} before simulation execution.`;
    }

    const quoteTime = new Date(item.lastUpdatedAt).getTime();
    if (!Number.isFinite(quoteTime) || Date.now() - quoteTime > 15 * 60 * 1000) {
      return `Fresh ETF quote required for ${item.symbol} before simulation execution.`;
    }

    return undefined;
  }

  return (
    <>
      <MarketGraphSection graph={graph} messages={messages} />

      <Section className="dashboard-section dashboard-section--hero dashboard-section--after-market-graph">
        <WorkstationPageHeader
          eyebrow="Invest / ETFs"
          title="ETF benchmark lane"
          description="Use benchmark products as broad market anchors for allocation planning, hedging, and guarded simulation workflows."
          summary="ETF simulation is enabled. Future live execution still requires broker product mapping, permissions, and readiness gates."
          statusLabel={invest.statusLabel}
          statusTone={invest.statusTone}
          meta={[
            { label: 'Coverage', value: `${group?.items.length ?? 0} products` },
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
            <div className="section__eyebrow">ETF listings</div>
            <h2 className="dashboard-section-heading__title">Benchmark ETFs with simulation-ready actions</h2>
            <p className="dashboard-section-heading__description">
              Switch between card and row mode without leaving the lane.
            </p>
          </div>
          <MarketViewToggle basePath="/invest/etfs" view={viewMode} />
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
                href={`/invest/etfs/${encodeURIComponent(item.symbol)}`}
                title={item.name}
                symbol={item.symbol}
                categoryLabel={item.category}
                thesis={item.thesis}
                priceLabel={formatUsdPrice(item.price, locale, messages.common.unavailable)}
                changeLabel={formatPercentChange(item.changePercent, messages.common.partial)}
                freshnessLabel={formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable)}
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
                    detailHref={`/invest/etfs/${encodeURIComponent(item.symbol)}`}
                    detailLabel="Open detail"
                    assetId={item.assetId}
                    symbol={item.symbol}
                    assetClass="etf"
                    isAuthenticated={Boolean(auth)}
                    strategyLaneId="manual_multi_asset_lane"
                    simulationSessionId={sessionContext?.sessionId ?? undefined}
                    disabled={Boolean(tradeDisabledReason)}
                    disabledReason={tradeDisabledReason}
                    showWatchlist
                    isWatched={watchlist.some((entry) => entry.assetId === item.assetId)}
                    watchlistLabelAdd={messages.dashboard.addToWatchlist}
                    watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
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
                freshnessLabel={formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable)}
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
                      detailHref={`/invest/etfs/${encodeURIComponent(item.symbol)}`}
                      detailLabel="Open detail"
                      assetId={item.assetId}
                      symbol={item.symbol}
                      assetClass="etf"
                      isAuthenticated={Boolean(auth)}
                      strategyLaneId="manual_multi_asset_lane"
                      simulationSessionId={sessionContext?.sessionId ?? undefined}
                      disabled={Boolean(tradeDisabledReason)}
                      disabledReason={tradeDisabledReason}
                      showWatchlist
                      isWatched={watchlist.some((entry) => entry.assetId === item.assetId)}
                      watchlistLabelAdd={messages.dashboard.addToWatchlist}
                      watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
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
              Page {invest.pagination.page} of {totalPages} · {invest.pagination.totalItems} products
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
    </>
  );
}
