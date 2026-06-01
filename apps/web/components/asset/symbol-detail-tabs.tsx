import Link from 'next/link';

export type SymbolDetailTabId = 'overview' | 'signals' | 'risk' | 'journal' | 'data';

export type SymbolDetailTab = {
  id: SymbolDetailTabId;
  label: string;
};

type SymbolDetailTabsProps = {
  basePath: string;
  activeTab: SymbolDetailTabId;
  tabs: SymbolDetailTab[];
  /** Extra query params to preserve when switching tabs. */
  query?: Record<string, string | undefined>;
  ariaLabel: string;
};

function buildHref(
  basePath: string,
  query: Record<string, string | undefined> | undefined,
  tabId: SymbolDetailTabId,
): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (!value || key === 'tab') continue;
      params.set(key, value);
    }
  }
  params.set('tab', tabId);
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * Server-only, Link-based tab bar for the symbol detail pages.
 *
 * Uses URL-param navigation (?tab=) rather than client useState so it never has
 * to receive ReactNode panels across the RSC boundary — the page server-renders
 * only the active panel. This keeps the SimulatedOrderForm / SignalSummary
 * subtrees as ordinary server children, never serialized as props.
 *
 * Reuses the existing .signals-tab-bar / .signals-tab-btn styling. The active
 * tab carries aria-current + aria-selected; the bar is a role=tablist.
 */
export function SymbolDetailTabs({ basePath, activeTab, tabs, query, ariaLabel }: SymbolDetailTabsProps) {
  return (
    <div className="signals-tab-bar detail-tab-bar" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const selected = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={buildHref(basePath, query, tab.id)}
            role="tab"
            aria-selected={selected}
            aria-current={selected ? 'page' : undefined}
            className={`signals-tab-btn${selected ? ' signals-tab-btn--active' : ''}`}
            scroll={false}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
