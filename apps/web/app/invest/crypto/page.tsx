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
import { loadMiniHistorySeries } from '../../../server/services/stock-simulation-service';

export const dynamic = 'force-dynamic';

export default async function InvestCryptoPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const params = searchParams ? await searchParams : {};
  const viewMode: MarketViewMode = params?.view === 'list' ? 'list' : 'grid';
  const [invest, graph, auth] = await Promise.all([
    getInvestOverviewData(locale, messages),
    getMarketGraphData({
      assetClass: 'crypto',
      preferredSymbols: ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT'],
      limit: 8,
    }),
    getOptionalCurrentSession(),
  ]);
  const group = invest.groupedAssets.find((item) => item.assetClass === 'crypto');
  const items = group?.items ?? [];
  const watchlist = auth ? await getUserWatchlist(auth.user.id) : [];
  const sparklineBySymbol = await loadMiniHistorySeries(items.map((item) => item.symbol), 24);

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
            viewMode === 'grid' ? (
              <InvestableAssetCard
                key={item.assetId}
                href={`/invest/crypto/${encodeURIComponent(item.symbol)}`}
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
                sparkline={sparklineBySymbol[item.symbol] ?? []}
                actions={(
                  <QuickTradeActions
                    detailHref={`/invest/crypto/${encodeURIComponent(item.symbol)}`}
                    detailLabel="Open detail"
                    assetId={item.assetId}
                    symbol={item.symbol}
                    assetClass="crypto"
                    isAuthenticated={Boolean(auth)}
                    strategyLaneId="manual_multi_asset_lane"
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
                sparkline={sparklineBySymbol[item.symbol] ?? []}
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
