import Link from 'next/link';

type MarketViewMode = 'grid' | 'list';

type MarketViewToggleProps = {
  basePath: string;
  view: MarketViewMode;
  query?: Record<string, string | undefined>;
  paramKey?: string;
};

function buildHref(
  basePath: string,
  query: Record<string, string | undefined> | undefined,
  view: MarketViewMode,
  paramKey: string,
) {
  const params = new URLSearchParams();

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (!value || key === paramKey) {
        continue;
      }
      params.set(key, value);
    }
  }

  params.set(paramKey, view);
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function MarketViewToggle({ basePath, view, query, paramKey = 'view' }: MarketViewToggleProps) {
  return (
    <div className="market-view-toggle" role="group" aria-label="Market view">
      <Link
        href={buildHref(basePath, query, 'grid', paramKey)}
        className={`button ${view === 'grid' ? 'button--primary' : 'button--secondary'} market-view-toggle__button`}
        aria-pressed={view === 'grid'}
      >
        Grid
      </Link>
      <Link
        href={buildHref(basePath, query, 'list', paramKey)}
        className={`button ${view === 'list' ? 'button--primary' : 'button--secondary'} market-view-toggle__button`}
        aria-pressed={view === 'list'}
      >
        List
      </Link>
    </div>
  );
}

export type { MarketViewMode };
