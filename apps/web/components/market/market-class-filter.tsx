import Link from 'next/link';
import type { MarketCatalogClassFilter } from '../../server/services/stock-simulation-service';

type MarketClassFilterProps = {
  basePath: string;
  active: MarketCatalogClassFilter;
  counts: Record<MarketCatalogClassFilter, number>;
  /** Extra query params to preserve across filter changes (e.g. q, view). */
  query?: Record<string, string | undefined>;
};

const CLASS_TABS: Array<{ id: MarketCatalogClassFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'stock', label: 'Stocks' },
  { id: 'etf', label: 'ETFs' },
  { id: 'crypto', label: 'Crypto' },
];

function buildHref(
  basePath: string,
  query: Record<string, string | undefined> | undefined,
  id: MarketCatalogClassFilter,
): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (!value || key === 'class' || key === 'page') continue;
      params.set(key, value);
    }
  }
  // 'all' is the default — keep the URL clean by omitting it. Always reset page.
  if (id !== 'all') params.set('class', id);
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * Asset-class filter for the market roster. URL-driven (RSC-safe, no client JS),
 * mirroring MarketViewToggle. Each tab carries a live count of matches for the
 * current search so the user can see class distribution at a glance.
 */
export function MarketClassFilter({ basePath, active, counts, query }: MarketClassFilterProps) {
  return (
    <div className="market-class-filter" role="group" aria-label="Filter market by asset class">
      {CLASS_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={buildHref(basePath, query, tab.id)}
            aria-pressed={isActive}
            // Keep the viewport where it is when switching filters — the roster
            // updates in place instead of jumping back to the top of the page.
            scroll={false}
            className={`button market-class-filter__tab ${isActive ? 'button--primary' : 'button--secondary'}`}
          >
            <span>{tab.label}</span>
            <span
              className={`num-bubble num-bubble--small ${isActive ? 'num-bubble--info' : 'num-bubble--muted'}`}
              aria-label={`${counts[tab.id]} ${tab.label}`}
            >
              {counts[tab.id]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
