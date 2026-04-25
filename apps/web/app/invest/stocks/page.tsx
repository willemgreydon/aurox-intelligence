import Link from 'next/link';
import { getUserWatchlist } from '@repo/db';
import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { InvestableAssetCard } from '../../../components/invest/investable-asset-card';
import { MarketAssetRow } from '../../../components/invest/market-asset-row';
import { MarketViewToggle, type MarketViewMode } from '../../../components/invest/market-view-toggle';
import { QuickTradeActions } from '../../../components/invest/quick-trade-actions';
import { getMessages } from '../../../lib/i18n/messages';
import { getOptionalCurrentSession } from '../../../server/auth/session';
import { getRequestLocale } from '../../../server/i18n/locale';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice } from '../../../server/lib/quote-display';
import { getInvestOverviewData } from '../../../server/services/invest-service';
import { perfLog, perfNow } from '../../../server/lib/perf';

export const dynamic = 'force-dynamic';

export default async function InvestStocksPage({
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
  const pageSize = viewMode === 'list' ? 24 : 18;
  const [invest, auth] = await Promise.all([
    getInvestOverviewData(locale, messages, {
      assetClassFilter: 'stock',
      page,
      pageSize,
      includeHistory: true,
      historySymbolLimit: Math.max(24, pageSize),
      pageContext: 'invest-stocks-page',
    }),
    getOptionalCurrentSession(),
  ]);
  perfLog('page:/invest/stocks loaders', pageStart);
  const group = invest.groupedAssets.find((item) => item.assetClass === 'stock');
  const items = group?.items ?? [];
  const watchlist = auth ? await getUserWatchlist(auth.user.id) : [];
  const totalPages = Math.max(1, Math.ceil(invest.pagination.totalItems / invest.pagination.pageSize));
  const previousPageHref = `/invest/stocks?${new URLSearchParams({
    ...(viewMode === 'list' ? { view: 'list' } : {}),
    page: String(Math.max(1, invest.pagination.page - 1)),
  }).toString()}`;
  const nextPageHref = `/invest/stocks?${new URLSearchParams({
    ...(viewMode === 'list' ? { view: 'list' } : {}),
    page: String(invest.pagination.page + 1),
  }).toString()}`;
  perfLog('page:/invest/stocks total', pageStart);

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Invest / Stocks"
          title="Stocks"
          description="Research and planning surface for equity allocation intent, watchlist capture, and quote-aware stock comparison."
          summary="Actions remain simulated and planning-oriented until brokerage or order-routing integrations exist."
          statusLabel={invest.statusLabel}
          statusTone={invest.statusTone}
          meta={[
            { label: 'Coverage', value: `${group?.items.length ?? 0} symbols` },
            { label: 'Action availability', value: 'Simulated' },
            { label: 'Last updated', value: invest.lastUpdatedLabel },
          ]}
          actions={[
            { href: '/invest', label: 'Back to invest' },
            { href: '/stocks', label: 'Open stocks workstation' },
            { href: '/dashboard', label: 'Open dashboard' },
          ]}
        />
      </Section>
      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Stock listings</div>
            <h2 className="dashboard-section-heading__title">High-density stock browse</h2>
            <p className="dashboard-section-heading__description">
              Switch between card scan mode and execution-oriented rows.
            </p>
          </div>
          <MarketViewToggle basePath="/invest/stocks" view={viewMode} />
        </header>
        <div className={viewMode === 'grid' ? 'analytics-three-grid' : 'market-list'}>
          {items.map((item) => (
            (() => {
              const resolvedDecision = invest.decisionBySymbol[item.symbol] ?? {
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
                href={`/stocks/${item.symbol}`}
                title={item.name}
                symbol={item.symbol}
                categoryLabel={item.sector ?? item.category}
                thesis={item.thesis}
                priceLabel={formatUsdPrice(item.price, locale, messages.common.unavailable)}
                changeLabel={formatPercentChange(item.changePercent, messages.common.partial)}
                freshnessLabel={formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable)}
                actionAvailability={item.actionAvailability}
                insightStance={item.insightStance}
                riskSummary={item.riskSummary}
                riskLabel={resolvedDecision.risk.label}
                sparkline={sparkline}
                miniChartModel={miniChartModel}
                signal={{
                  score: resolvedDecision.signal.score,
                  label: resolvedDecision.signal.label,
                  confidence: resolvedDecision.signal.confidence,
                  explanation: resolvedDecision.signal.explanation,
                  indicators: resolvedDecision.signal.contributingIndicators,
                  visualState: resolvedDecision.signal.visualState,
                }}
                actions={(
                  <QuickTradeActions
                    detailHref={`/stocks/${item.symbol}`}
                    assetId={item.assetId}
                    symbol={item.symbol}
                    assetClass="stock"
                    isAuthenticated={Boolean(auth)}
                    strategyLaneId="manual_stock_lane"
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
                category={item.sector ?? item.category}
                thesis={item.thesis}
                priceLabel={formatUsdPrice(item.price, locale, messages.common.unavailable)}
                changeLabel={formatPercentChange(item.changePercent, messages.common.partial)}
                freshnessLabel={formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable)}
                actionAvailability={item.actionAvailability}
                insightStance={item.insightStance}
                sparkline={sparkline}
                miniChartModel={miniChartModel}
                riskLabel={resolvedDecision.risk.label}
                signal={{
                  score: resolvedDecision.signal.score,
                  label: resolvedDecision.signal.label,
                  confidence: resolvedDecision.signal.confidence,
                  visualState: resolvedDecision.signal.visualState,
                  explanation: resolvedDecision.signal.explanation,
                }}
                actions={(
                  <div className="market-row__action-grid">
                    <QuickTradeActions
                      detailHref={`/stocks/${item.symbol}`}
                      assetId={item.assetId}
                      symbol={item.symbol}
                      assetClass="stock"
                      isAuthenticated={Boolean(auth)}
                      strategyLaneId="manual_stock_lane"
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
              Page {invest.pagination.page} of {totalPages} · {invest.pagination.totalItems} symbols
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
