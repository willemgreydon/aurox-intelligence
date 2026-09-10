import Link from 'next/link';
import { MarketGraphSection } from '../../components/charts/market-graph-section';
import { SimulationModeBadge } from '../../components/ui/simulation-mode-badge';
import { Section } from '../../components/ui/section';
import { CompactStatCard } from '../../components/stats/compact-stat-card';
import { MarketViewToggle, type MarketViewMode } from '../../components/invest/market-view-toggle';
import { MarketClassFilter } from '../../components/market/market-class-filter';
import { MarketRoster } from '../../components/market/market-roster';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';
import { getMarketGraphData } from '../../server/services/market-graph-service';
import { getNewsStreamData } from '../../server/services/news-service';
import {
  getMarketCatalogPageData,
  loadMiniHistorySeries,
  type MarketCatalogClassFilter,
} from '../../server/services/stock-simulation-service';
import { mapCatalogEntriesToRoster } from '../../server/mappers/market-roster-mapper';
import { formatPercentChange } from '../../server/lib/quote-display';
import { getOptionalCurrentSession } from '../../server/auth/session';
import { perfLog, perfNow } from '../../server/lib/perf';
import { getWorkspaceTrackedSymbols } from '../../server/services/workspace-service';

// User-scoped roster data (watchlist + positions) and URL-driven filters — must
// stay dynamic (user-specific-cache-rule + next-cache-rule).
export const dynamic = 'force-dynamic';

const CLASS_FILTERS: readonly MarketCatalogClassFilter[] = ['all', 'stock', 'etf', 'crypto'] as const;

type MarketPageProps = {
  searchParams?: Promise<{ q?: string; view?: string; page?: string; class?: string }>;
};

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const pageStart = perfNow();
  const params = searchParams ? await searchParams : {};
  const query = params?.q?.trim() ?? '';
  const viewMode: MarketViewMode = params?.view === 'list' ? 'list' : 'grid';
  const assetClass: MarketCatalogClassFilter = CLASS_FILTERS.includes(params?.class as MarketCatalogClassFilter)
    ? (params?.class as MarketCatalogClassFilter)
    : 'all';
  const page =
    Number.isFinite(Number(params?.page)) && Number(params?.page) > 0 ? Math.floor(Number(params?.page)) : 1;
  const pageSize = viewMode === 'list' ? 24 : 18;

  const [locale, preferredSymbols, auth] = await Promise.all([
    getRequestLocale(),
    getWorkspaceTrackedSymbols(20),
    getOptionalCurrentSession(),
  ]);
  const messages = getMessages(locale);

  const [graph, catalog, news] = await Promise.all([
    getMarketGraphData({
      ...(assetClass !== 'all' ? { assetClass } : {}),
      ...(preferredSymbols.length > 0 ? { preferredSymbols } : {}),
    }),
    getMarketCatalogPageData(query, { page, pageSize, assetClass }),
    getNewsStreamData().catch(() => ({ items: [] as never[] })),
  ]);
  perfLog('page:/market loaders', pageStart);

  // Sparklines for the visible roster entries only — bounded provider budget.
  const sparklineBySymbol = await loadMiniHistorySeries(
    catalog.entries.map((entry) => entry.asset.symbol),
    24,
  );
  const rosterCards = mapCatalogEntriesToRoster(catalog.entries, sparklineBySymbol, { locale, messages });

  // Visible-page summary stats.
  const pricedEntries = catalog.entries.filter((entry) => typeof entry.quote?.price === 'number');
  const positiveCount = pricedEntries.filter((entry) => (entry.quote?.changePercent ?? 0) > 0).length;
  const averageMove = pricedEntries.length
    ? pricedEntries.reduce((sum, entry) => sum + (entry.quote?.changePercent ?? 0), 0) / pricedEntries.length
    : 0;
  const tradableCount = catalog.entries.filter((entry) => entry.asset.isTradable).length;

  const totalPages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize));
  const buildRosterHref = (nextPage: number) =>
    `/market?${new URLSearchParams({
      ...(query ? { q: query } : {}),
      ...(assetClass !== 'all' ? { class: assetClass } : {}),
      ...(viewMode === 'list' ? { view: 'list' } : {}),
      page: String(nextPage),
    }).toString()}#market-roster`;

  perfLog('page:/market total', pageStart);

  return (
    <>
      {/* ── Compact Command Header — above the chart ── */}
      <header className="observe-command-header">
        <div className="observe-command-header__inner">
          <div className="observe-command-header__top">
            <div className="observe-command-header__identity">
              <span className="observe-command-header__eyebrow">Market / Graph Workstation</span>
              <h1 className="observe-command-header__title">{messages.marketGraph.title}</h1>
              <p className="observe-command-header__sub">{messages.marketGraph.subtitle}</p>
            </div>
            <div className="observe-command-header__chips">
              <span className="observe-chip observe-chip--info" title="Market data provider">
                {graph.meta.provider.toUpperCase()}
              </span>
              <span className="observe-chip observe-chip--neutral" title="Market entries">
                {catalog.classCounts.all} Entries
              </span>
              <span className="observe-chip observe-chip--neutral" title="Assets on chart">
                {graph.assets.length} Charted
              </span>
              <SimulationModeBadge />
            </div>
          </div>
          <nav className="observe-command-header__actions" aria-label="Market primary actions">
            <a href="#market-roster" className="button button--secondary observe-command-action">Browse all</a>
            <a href="/observe" className="button button--secondary observe-command-action">Observer</a>
            <a href="/signals" className="button button--secondary observe-command-action">Signals</a>
            <a href="/stocks" className="button button--secondary observe-command-action">Stocks</a>
            <a href="/invest/simulation" className="button button--secondary observe-command-action">Simulation</a>
          </nav>
        </div>
      </header>

      <MarketGraphSection graph={graph} messages={messages} trackedSymbols={preferredSymbols} newsItems={news.items} />

      {/* ── Full market roster: every entry across stocks, ETFs, and crypto ── */}
      <Section id="market-roster" className="dashboard-section dashboard-section--after-market-graph">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Roster</div>
            <h2 className="dashboard-section-heading__title">All market entries</h2>
            <p className="dashboard-section-heading__description">
              {catalog.providerError ??
                'Every tracked instrument across stocks, ETFs, and crypto — real quotes, deterministic signals, simulation-only execution.'}
            </p>
          </div>
          <MarketViewToggle
            basePath="/market"
            view={viewMode}
            query={{
              q: query || undefined,
              class: assetClass !== 'all' ? assetClass : undefined,
            }}
          />
        </header>

        <div className="analytics-strip">
          <CompactStatCard
            label="Market entries"
            value={String(catalog.total)}
            detail="Total instruments matching the current filter and search."
          />
          <CompactStatCard
            label="Positive movers"
            value={String(positiveCount)}
            detail="Entries on this page showing a positive day move in the available quote set."
          />
          <CompactStatCard
            label="Average move"
            value={formatPercentChange(averageMove, messages.common.partial)}
            detail="Average day move across the priced entries on this page."
          />
          <CompactStatCard
            label="Paper-tradable"
            value={String(tradableCount)}
            detail="Entries on this page that can be bought or sold with fictive cash."
          />
        </div>

        <form className="stock-search-form" action="/market" method="get">
          {assetClass !== 'all' ? <input type="hidden" name="class" value={assetClass} /> : null}
          {viewMode === 'list' ? <input type="hidden" name="view" value="list" /> : null}
          <label className="form-field">
            <span>Market search</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search AAPL, Bitcoin, semiconductors, S&P 500..."
            />
          </label>
          <button type="submit" className="button button--secondary">Search</button>
          {query ? (
            <Link href={assetClass !== 'all' ? `/market?class=${assetClass}` : '/market'} className="button button--secondary">
              Clear
            </Link>
          ) : null}
        </form>

        <MarketClassFilter
          basePath="/market"
          active={assetClass}
          counts={catalog.classCounts}
          query={{ q: query || undefined, view: viewMode === 'list' ? 'list' : undefined }}
        />

        <MarketRoster
          cards={rosterCards}
          viewMode={viewMode}
          isAuthenticated={Boolean(auth)}
          labels={{
            emptyTitle: 'No matching market entries',
            emptyDescription: 'Try a different symbol, name, or sector — or switch the asset-class filter.',
            addToWatchlist: messages.dashboard.addToWatchlist,
            removeFromWatchlist: messages.dashboard.removeFromWatchlist,
          }}
        />

        {catalog.total > catalog.pageSize ? (
          <div className="market-pagination">
            <span className="market-pagination__meta">
              Page {catalog.page} of {totalPages} · {catalog.total} entries
            </span>
            <div className="market-pagination__actions">
              {catalog.hasPreviousPage ? (
                <Link href={buildRosterHref(catalog.page - 1)} className="button button--secondary">
                  Previous
                </Link>
              ) : (
                <span className="button button--secondary" aria-disabled="true">Previous</span>
              )}
              {catalog.hasNextPage ? (
                <Link href={buildRosterHref(catalog.page + 1)} className="button button--secondary">
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
