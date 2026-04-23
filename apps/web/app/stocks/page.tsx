import Link from 'next/link';
import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { MarketGraphSection } from '../../components/charts/market-graph-section';
import { Card } from '../../components/ui/card';
import { CompactStatCard } from '../../components/stats/compact-stat-card';
import { SimulatedOrderForm, WatchlistToggleForm } from '../../components/invest/simulation-action-form';
import { StatePanel } from '../../components/ui/state-panel';
import { getMessages } from '../../lib/i18n/messages';
import { formatDateTimeLabel } from '../../lib/formatters';
import { getRequestLocale } from '../../server/i18n/locale';
import { formatPercentChange, formatUsdPrice, formatFreshnessLabel, getQuoteTimestamp } from '../../server/lib/quote-display';
import { getMarketGraphData } from '../../server/services/market-graph-service';
import { getStockCatalogPageData } from '../../server/services/stock-simulation-service';

export const dynamic = 'force-dynamic';

type StocksPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function StocksPage({ searchParams }: StocksPageProps) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const params = searchParams ? await searchParams : {};
  const query = params?.q?.trim() ?? '';
  const [stocks, graph] = await Promise.all([
    getStockCatalogPageData(query),
    getMarketGraphData({
      assetClass: 'stock',
      preferredSymbols: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'],
      limit: 14,
    }),
  ]);
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
        </header>
        <div className="analytics-two-grid">
          {stocks.stocks.length > 0 ? (
            stocks.stocks.map((entry) => (
              <Card key={entry.asset.assetId} className="analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <div className="section__eyebrow">{entry.asset.sector ?? entry.asset.category}</div>
                    <h3>{entry.asset.symbol}</h3>
                    <p>{entry.asset.name}</p>
                  </div>
                </div>
                <div className="analytics-card__body">
                  <p>{formatUsdPrice(entry.quote?.price ?? null, locale, messages.common.unavailable)}</p>
                  <p>{formatPercentChange(entry.quote?.changePercent ?? null, messages.common.partial)}</p>
                  <p>{formatFreshnessLabel(getQuoteTimestamp(entry.quote), locale, messages.common.unavailable)}</p>
                  <p>{entry.asset.thesis}</p>
                  {entry.position ? (
                    <p>
                      Held: {entry.position.quantity.toFixed(4)} shares, market value {formatUsdPrice(entry.position.marketValue, locale, messages.common.unavailable)}
                    </p>
                  ) : null}
                </div>
                <div className="analytics-card__action-grid">
                  <Link href={`/stocks/${entry.asset.symbol}`} className="button button--secondary">
                    {messages.common.details}
                  </Link>
                  <WatchlistToggleForm
                    assetId={entry.asset.assetId}
                    symbol={entry.asset.symbol}
                    assetClass="stock"
                    active={entry.isWatched}
                    label={entry.isWatched ? messages.dashboard.removeFromWatchlist : messages.dashboard.addToWatchlist}
                  />
                  <SimulatedOrderForm assetId={entry.asset.assetId} symbol={entry.asset.symbol} assetClass="stock" side="buy" label={messages.dashboard.buySimulated} />
                  <SimulatedOrderForm assetId={entry.asset.assetId} symbol={entry.asset.symbol} assetClass="stock" side="sell" label={messages.dashboard.sellSimulated} />
                </div>
              </Card>
            ))
          ) : (
            <StatePanel
              title="No matching stocks"
              description="Try a different symbol, name, or sector search to find a stock in the launch universe."
              tone="subtle"
            />
          )}
        </div>
      </Section>
    </>
  );
}
