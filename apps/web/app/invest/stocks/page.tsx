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
import { loadMiniHistorySeries } from '../../../server/services/stock-simulation-service';

export const dynamic = 'force-dynamic';

export default async function InvestStocksPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const params = searchParams ? await searchParams : {};
  const viewMode: MarketViewMode = params?.view === 'list' ? 'list' : 'grid';
  const [invest, auth] = await Promise.all([
    getInvestOverviewData(locale, messages),
    getOptionalCurrentSession(),
  ]);
  const group = invest.groupedAssets.find((item) => item.assetClass === 'stock');
  const items = group?.items ?? [];
  const watchlist = auth ? await getUserWatchlist(auth.user.id) : [];
  const sparklineBySymbol = await loadMiniHistorySeries(items.map((item) => item.symbol), 24);

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
            viewMode === 'grid' ? (
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
                sparkline={sparklineBySymbol[item.symbol] ?? []}
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
                sparkline={sparklineBySymbol[item.symbol] ?? []}
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
            )
          ))}
        </div>
      </Section>
    </>
  );
}
