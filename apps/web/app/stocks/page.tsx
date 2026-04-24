import Link from 'next/link';
import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { MarketGraphSection } from '../../components/charts/market-graph-section';
import { Card } from '../../components/ui/card';
import { CompactStatCard } from '../../components/stats/compact-stat-card';
import { MarketViewToggle, type MarketViewMode } from '../../components/invest/market-view-toggle';
import { InvestableAssetCard } from '../../components/invest/investable-asset-card';
import { MarketAssetRow } from '../../components/invest/market-asset-row';
import { QuickTradeActions } from '../../components/invest/quick-trade-actions';
import { StatePanel } from '../../components/ui/state-panel';
import { getMessages } from '../../lib/i18n/messages';
import { formatDateTimeLabel } from '../../lib/formatters';
import { getOptionalCurrentSession } from '../../server/auth/session';
import { getRequestLocale } from '../../server/i18n/locale';
import { formatPercentChange, formatUsdPrice, formatFreshnessLabel, getQuoteTimestamp } from '../../server/lib/quote-display';
import { getMarketGraphData } from '../../server/services/market-graph-service';
import { getStockCatalogPageData, loadMiniHistorySeries } from '../../server/services/stock-simulation-service';

export const dynamic = 'force-dynamic';

type StocksPageProps = {
  searchParams?: Promise<{
    q?: string;
    view?: string;
    page?: string;
  }>;
};

export default async function StocksPage({ searchParams }: StocksPageProps) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const params = searchParams ? await searchParams : {};
  const query = params?.q?.trim() ?? '';
  const viewMode: MarketViewMode = params?.view === 'list' ? 'list' : 'grid';
  const page = Number.isFinite(Number(params?.page)) && Number(params?.page) > 0
    ? Math.floor(Number(params?.page))
    : 1;
  const pageSize = viewMode === 'list' ? 24 : 18;
  const [stocks, graph, auth] = await Promise.all([
    getStockCatalogPageData(query, { page, pageSize }),
    getMarketGraphData({
      assetClass: 'stock',
      preferredSymbols: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'],
      limit: 14,
    }),
    getOptionalCurrentSession(),
  ]);
  const sparklineBySymbol = await loadMiniHistorySeries(stocks.stocks.map((entry) => entry.asset.symbol), 24);
  const pricedStocks = stocks.stocks.filter((entry) => typeof entry.quote?.price === 'number');
  const latestObservedAt =
    stocks.stocks
      .map((entry) => getQuoteTimestamp(entry.quote))
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
  const positiveCount = pricedStocks.filter((entry) => (entry.quote?.changePercent ?? 0) > 0).length;
  const averageMove = pricedStocks.length
    ? pricedStocks.reduce((sum, entry) => sum + (entry.quote?.changePercent ?? 0), 0) / pricedStocks.length
    : 0;
  const totalPages = Math.max(1, Math.ceil(stocks.totalStocks / stocks.pageSize));
  const previousPageHref = `/stocks?${new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(viewMode === 'list' ? { view: 'list' } : {}),
    page: String(Math.max(1, stocks.page - 1)),
  }).toString()}`;
  const nextPageHref = `/stocks?${new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(viewMode === 'list' ? { view: 'list' } : {}),
    page: String(stocks.page + 1),
  }).toString()}`;

  return (
    <>
      <MarketGraphSection graph={graph} messages={messages} />

      <Section className="dashboard-section dashboard-section--hero dashboard-section--after-market-graph">
        <WorkstationPageHeader
          eyebrow="Stocks"
          title="Stock workspace"
          description="Browse real stock quotes, save names to your watchlist, and open a stock detail view that is ready for paper-trading decisions."
          summary={messages.common.simulationDisclosure}
          statusLabel={stocks.providerError ? messages.status.attention : messages.status.nominal}
          statusTone={stocks.providerError ? 'warning' : 'success'}
          meta={[
            { label: messages.common.coverage, value: `${stocks.stocks.length} stocks` },
            { label: messages.common.lastUpdated, value: latestObservedAt ? formatDateTimeLabel(latestObservedAt, locale) : messages.common.unavailable },
            { label: messages.common.actionAvailability, value: 'Stock simulation only' },
          ]}
          actions={[
            { href: '/invest/simulation', label: messages.simulation.navLabel },
            { href: '/invest', label: messages.shell.nav.investHome },
            { href: '/dashboard', label: messages.shell.nav.dashboard },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label="Listed stocks" value={String(stocks.stocks.length)} detail="Stock catalog rows available for search, watchlist, and simulation workflows." />
          <CompactStatCard label="Positive movers" value={String(positiveCount)} detail="Stocks currently showing a positive day move in the available quote set." />
          <CompactStatCard label="Average move" value={formatPercentChange(averageMove, messages.common.partial)} detail="Average day move across the currently filtered stock list." />
          <CompactStatCard label="Paper-tradable" value={String(stocks.stocks.filter((entry) => entry.asset.isTradable).length)} detail="Stocks that can be bought or sold with fictive cash in this release." />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Search</div>
            <h2 className="dashboard-section-heading__title">Find a stock by symbol, name, category, or sector</h2>
            <p className="dashboard-section-heading__description">The search field filters the stock catalog without leaving the current page.</p>
          </div>
        </header>
        <form className="stock-search-form" action="/stocks" method="get">
          <label className="form-field">
            <span>Stock search</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search AAPL, Microsoft, semiconductors..."
            />
          </label>
          <button type="submit" className="button button--secondary">Search</button>
          {query ? (
            <Link href="/stocks" className="button button--secondary">
              Clear
            </Link>
          ) : null}
        </form>
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Catalog</div>
            <h2 className="dashboard-section-heading__title">Real stock data, simulation-only execution</h2>
            <p className="dashboard-section-heading__description">
              {stocks.providerError ?? 'Quotes and historical charts are backed by the market-data provider path and cached for reuse.'}
            </p>
          </div>
          <MarketViewToggle
            basePath="/stocks"
            view={viewMode}
            query={{ q: query || undefined }}
          />
        </header>
        <div className={viewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
          {stocks.stocks.length > 0 ? (
            stocks.stocks.map((entry) => (
              viewMode === 'grid' ? (
                <InvestableAssetCard
                  key={entry.asset.assetId}
                  href={`/stocks/${entry.asset.symbol}`}
                  title={entry.asset.name}
                  symbol={entry.asset.symbol}
                  categoryLabel={entry.asset.sector ?? entry.asset.category}
                  thesis={entry.asset.thesis}
                  priceLabel={formatUsdPrice(entry.quote?.price ?? null, locale, messages.common.unavailable)}
                  changeLabel={formatPercentChange(entry.quote?.changePercent ?? null, messages.common.partial)}
                  freshnessLabel={formatFreshnessLabel(getQuoteTimestamp(entry.quote), locale, messages.common.unavailable)}
                  actionAvailability={entry.asset.actionAvailability}
                  insightStance={entry.quote?.changePercent && entry.quote.changePercent < 0 ? 'negative' : entry.quote?.changePercent && entry.quote.changePercent > 0 ? 'positive' : 'neutral'}
                  riskSummary={entry.position
                    ? `Held ${entry.position.quantity.toFixed(4)} shares · Market value ${formatUsdPrice(entry.position.marketValue, locale, messages.common.unavailable)}`
                    : entry.asset.riskSummary}
                  sparkline={sparklineBySymbol[entry.asset.symbol] ?? []}
                  actions={(
                    <QuickTradeActions
                      detailHref={`/stocks/${entry.asset.symbol}`}
                      assetId={entry.asset.assetId}
                      symbol={entry.asset.symbol}
                      assetClass="stock"
                      isAuthenticated={Boolean(auth)}
                      strategyLaneId="manual_stock_lane"
                      showWatchlist
                      isWatched={entry.isWatched}
                      watchlistLabelAdd={messages.dashboard.addToWatchlist}
                      watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
                    />
                  )}
                />
              ) : (
                <MarketAssetRow
                  key={entry.asset.assetId}
                  symbol={entry.asset.symbol}
                  title={entry.asset.name}
                  category={entry.asset.sector ?? entry.asset.category}
                  thesis={entry.asset.thesis}
                  priceLabel={formatUsdPrice(entry.quote?.price ?? null, locale, messages.common.unavailable)}
                  changeLabel={formatPercentChange(entry.quote?.changePercent ?? null, messages.common.partial)}
                  freshnessLabel={formatFreshnessLabel(getQuoteTimestamp(entry.quote), locale, messages.common.unavailable)}
                  actionAvailability={entry.asset.actionAvailability}
                  insightStance={entry.quote?.changePercent && entry.quote.changePercent < 0 ? 'negative' : entry.quote?.changePercent && entry.quote.changePercent > 0 ? 'positive' : 'neutral'}
                  sparkline={sparklineBySymbol[entry.asset.symbol] ?? []}
                  actions={(
                    <div className="market-row__action-grid">
                      <QuickTradeActions
                        detailHref={`/stocks/${entry.asset.symbol}`}
                        assetId={entry.asset.assetId}
                        symbol={entry.asset.symbol}
                        assetClass="stock"
                        isAuthenticated={Boolean(auth)}
                        strategyLaneId="manual_stock_lane"
                        showWatchlist
                        isWatched={entry.isWatched}
                        watchlistLabelAdd={messages.dashboard.addToWatchlist}
                        watchlistLabelRemove={messages.dashboard.removeFromWatchlist}
                      />
                    </div>
                  )}
                />
              )
            ))
          ) : (
            <StatePanel
              title="No matching stocks"
              description="Try a different symbol, name, or sector search to find a stock in the launch universe."
              tone="subtle"
            />
          )}
        </div>
        {stocks.totalStocks > stocks.pageSize ? (
          <div className="market-pagination">
            <span className="market-pagination__meta">
              Page {stocks.page} of {totalPages} · {stocks.totalStocks} symbols
            </span>
            <div className="market-pagination__actions">
              {stocks.hasPreviousPage ? (
                <Link href={previousPageHref} className="button button--secondary">
                  Previous
                </Link>
              ) : (
                <span className="button button--secondary" aria-disabled="true">Previous</span>
              )}
              {stocks.hasNextPage ? (
                <Link href={nextPageHref} className="button button--secondary">
                  Next
                </Link>
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
