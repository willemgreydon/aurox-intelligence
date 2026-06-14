'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  applyUniverseView,
  summarizeUniverse,
  type UniverseAssetClass,
  type UniverseFilters,
  type UniverseItemFacts,
  type UniversePositionState,
  type UniverseSortKey,
  type UniverseSupport,
} from '../../lib/simulation-universe-filter';
import type { QuoteFreshnessState } from '../../lib/quote-freshness-display';

export type UniverseExplorerItem = UniverseItemFacts & { node: ReactNode };

type ExplorerLabels = Partial<{
  searchPlaceholder: string;
  sortLabel: string;
  sortSymbol: string;
  sortFreshness: string;
  sortSupport: string;
  clearFilters: string;
  resultsTemplate: string; // "{{shown}} of {{total}}"
  emptyFiltered: string;
  paginationTemplate: string; // "Page {{page}} of {{total}} · {{count}} assets"
  paginationPrevious: string;
  paginationNext: string;
  groupAssetClass: string;
  groupSupport: string;
  groupPosition: string;
  groupFreshness: string;
  classStock: string;
  classEtf: string;
  classCrypto: string;
  supportAvailable: string;
  supportSimulated: string;
  supportPlanned: string;
  supportUnavailable: string;
  positionHeld: string;
  positionNotHeld: string;
  summaryHeld: string;
  summaryWatchlist: string;
  summarySellable: string;
  summaryStale: string;
  summaryUnavailable: string;
  freshnessLive: string;
  freshnessDelayed: string;
  freshnessMarketClosed: string;
  freshnessStale: string;
  freshnessPartial: string;
  freshnessUnavailable: string;
}>;

type Props = {
  items: UniverseExplorerItem[];
  viewMode: 'grid' | 'list';
  labels?: ExplorerLabels;
  /** Items per page. Defaults to 12 (grid) / 20 (list) when not provided. */
  pageSize?: number;
};

const DEFAULTS: Required<ExplorerLabels> = {
  searchPlaceholder: 'Search symbol or name',
  sortLabel: 'Sort',
  sortSymbol: 'Symbol',
  sortFreshness: 'Quote freshness',
  sortSupport: 'Support status',
  clearFilters: 'Clear filters',
  resultsTemplate: '{{shown}} of {{total}}',
  emptyFiltered: 'No assets match the current filters.',
  paginationTemplate: 'Page {{page}} of {{total}} · {{count}} assets',
  paginationPrevious: 'Previous',
  paginationNext: 'Next',
  groupAssetClass: 'Asset class',
  groupSupport: 'Support',
  groupPosition: 'Position',
  groupFreshness: 'Freshness',
  classStock: 'Stocks',
  classEtf: 'ETFs',
  classCrypto: 'Crypto',
  supportAvailable: 'Available',
  supportSimulated: 'Simulated',
  supportPlanned: 'Planned',
  supportUnavailable: 'Unavailable',
  positionHeld: 'Held',
  positionNotHeld: 'Not held',
  summaryHeld: 'Held',
  summaryWatchlist: 'Watchlist',
  summarySellable: 'Sellable',
  summaryStale: 'Stale / partial',
  summaryUnavailable: 'Unavailable',
  freshnessLive: 'Live',
  freshnessDelayed: 'Delayed',
  freshnessMarketClosed: 'Market closed',
  freshnessStale: 'Stale',
  freshnessPartial: 'Partial',
  freshnessUnavailable: 'Unavailable',
};

const ASSET_CLASSES: UniverseAssetClass[] = ['stock', 'etf', 'crypto'];
const SUPPORTS: UniverseSupport[] = ['available', 'simulated', 'planned', 'unavailable'];
const POSITION_STATES: UniversePositionState[] = ['held', 'not_held'];
const FRESHNESS_STATES: QuoteFreshnessState[] = ['live', 'delayed', 'market_closed', 'stale', 'partial', 'unavailable'];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function TradableUniverseExplorer({ items, viewMode, labels, pageSize }: Props) {
  const t = { ...DEFAULTS, ...labels };
  const effectivePageSize = pageSize ?? (viewMode === 'list' ? 20 : 12);
  const [search, setSearch] = useState('');
  const [assetClasses, setAssetClasses] = useState<UniverseAssetClass[]>([]);
  const [support, setSupport] = useState<UniverseSupport[]>([]);
  const [positionState, setPositionState] = useState<UniversePositionState[]>([]);
  const [freshness, setFreshness] = useState<QuoteFreshnessState[]>([]);
  const [sort, setSort] = useState<UniverseSortKey>('symbol');
  const [page, setPage] = useState(1);

  const filters: UniverseFilters = useMemo(
    () => ({ search, assetClasses, support, positionState, freshness }),
    [search, assetClasses, support, positionState, freshness],
  );

  const shown = useMemo(() => applyUniverseView(items, filters, sort), [items, filters, sort]);
  const summary = useMemo(() => summarizeUniverse(items, shown), [items, shown]);

  const totalPages = Math.max(1, Math.ceil(shown.length / effectivePageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = shown.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize);
  const showPagination = shown.length > effectivePageSize;

  const hasActiveFilters =
    search.trim() !== '' ||
    assetClasses.length > 0 ||
    support.length > 0 ||
    positionState.length > 0 ||
    freshness.length > 0;

  // Any filter/sort/search change returns to page 1 so the user is never
  // stranded on a now-empty page. Resetting in the handler (not an effect)
  // keeps render pure.
  function clearFilters() {
    setSearch('');
    setAssetClasses([]);
    setSupport([]);
    setPositionState([]);
    setFreshness([]);
    setPage(1);
  }
  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  function handleSort(value: UniverseSortKey) {
    setSort(value);
    setPage(1);
  }
  function toggleAssetClass(value: UniverseAssetClass) {
    setAssetClasses((prev) => toggle(prev, value));
    setPage(1);
  }
  function toggleSupport(value: UniverseSupport) {
    setSupport((prev) => toggle(prev, value));
    setPage(1);
  }
  function togglePosition(value: UniversePositionState) {
    setPositionState((prev) => toggle(prev, value));
    setPage(1);
  }
  function toggleFreshness(value: QuoteFreshnessState) {
    setFreshness((prev) => toggle(prev, value));
    setPage(1);
  }

  const classLabel: Record<UniverseAssetClass, string> = {
    stock: t.classStock,
    etf: t.classEtf,
    crypto: t.classCrypto,
  };
  const supportLabel: Record<UniverseSupport, string> = {
    available: t.supportAvailable,
    simulated: t.supportSimulated,
    planned: t.supportPlanned,
    unavailable: t.supportUnavailable,
  };
  const positionLabel: Record<UniversePositionState, string> = {
    held: t.positionHeld,
    not_held: t.positionNotHeld,
  };
  const freshnessLabel: Record<QuoteFreshnessState, string> = {
    live: t.freshnessLive,
    delayed: t.freshnessDelayed,
    market_closed: t.freshnessMarketClosed,
    stale: t.freshnessStale,
    partial: t.freshnessPartial,
    unavailable: t.freshnessUnavailable,
  };

  const resultsText = t.resultsTemplate
    .replace('{{shown}}', String(summary.shown))
    .replace('{{total}}', String(summary.total));

  return (
    <div className="universe-explorer">
      {/* Compact summary */}
      <dl className="universe-explorer__summary" aria-label="Universe summary">
        <div className="universe-explorer__summary-item">
          <dt>{t.summaryHeld}</dt>
          <dd className="num-bubble">{summary.held}</dd>
        </div>
        <div className="universe-explorer__summary-item">
          <dt>{t.summaryWatchlist}</dt>
          <dd className="num-bubble">{summary.watchlist}</dd>
        </div>
        <div className="universe-explorer__summary-item">
          <dt>{t.summarySellable}</dt>
          <dd className="num-bubble">{summary.sellable}</dd>
        </div>
        <div className="universe-explorer__summary-item">
          <dt>{t.summaryStale}</dt>
          <dd className={`num-bubble${summary.staleOrPartial > 0 ? ' num-bubble--warning' : ''}`}>
            {summary.staleOrPartial}
          </dd>
        </div>
        <div className="universe-explorer__summary-item">
          <dt>{t.summaryUnavailable}</dt>
          <dd className={`num-bubble${summary.unavailable > 0 ? ' num-bubble--muted' : ''}`}>
            {summary.unavailable}
          </dd>
        </div>
      </dl>

      {/* Controls */}
      <div className="universe-explorer__controls">
        <input
          type="search"
          className="universe-explorer__search"
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          value={search}
          onChange={(event) => handleSearch(event.currentTarget.value)}
        />
        <label className="universe-explorer__sort">
          <span>{t.sortLabel}</span>
          <select value={sort} onChange={(event) => handleSort(event.currentTarget.value as UniverseSortKey)}>
            <option value="symbol">{t.sortSymbol}</option>
            <option value="freshness">{t.sortFreshness}</option>
            <option value="support">{t.sortSupport}</option>
          </select>
        </label>
        {hasActiveFilters && (
          <button type="button" className="button button--ghost" onClick={clearFilters}>
            {t.clearFilters}
          </button>
        )}
        <span className="universe-explorer__results" role="status" aria-live="polite">
          {resultsText}
        </span>
      </div>

      <div className="universe-explorer__filter-groups">
        <fieldset className="universe-explorer__group">
          <legend>{t.groupAssetClass}</legend>
          {ASSET_CLASSES.map((value) => (
            <FilterChip
              key={value}
              label={classLabel[value]}
              active={assetClasses.includes(value)}
              onToggle={() => toggleAssetClass(value)}
            />
          ))}
        </fieldset>
        <fieldset className="universe-explorer__group">
          <legend>{t.groupSupport}</legend>
          {SUPPORTS.map((value) => (
            <FilterChip
              key={value}
              label={supportLabel[value]}
              active={support.includes(value)}
              onToggle={() => toggleSupport(value)}
            />
          ))}
        </fieldset>
        <fieldset className="universe-explorer__group">
          <legend>{t.groupPosition}</legend>
          {POSITION_STATES.map((value) => (
            <FilterChip
              key={value}
              label={positionLabel[value]}
              active={positionState.includes(value)}
              onToggle={() => togglePosition(value)}
            />
          ))}
        </fieldset>
        <fieldset className="universe-explorer__group">
          <legend>{t.groupFreshness}</legend>
          {FRESHNESS_STATES.map((value) => (
            <FilterChip
              key={value}
              label={freshnessLabel[value]}
              active={freshness.includes(value)}
              onToggle={() => toggleFreshness(value)}
            />
          ))}
        </fieldset>
      </div>

      {/* Results */}
      {shown.length > 0 ? (
        <>
          <div className={viewMode === 'grid' ? 'analytics-two-grid' : 'market-list'}>
            {pagedItems.map((item) => (
              <div key={item.key}>{item.node}</div>
            ))}
          </div>
          {showPagination && (
            <div className="market-pagination">
              <span className="market-pagination__meta" role="status" aria-live="polite">
                {t.paginationTemplate
                  .replace('{{page}}', String(currentPage))
                  .replace('{{total}}', String(totalPages))
                  .replace('{{count}}', String(shown.length))}
              </span>
              <div className="market-pagination__actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  aria-disabled={currentPage <= 1}
                >
                  {t.paginationPrevious}
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  aria-disabled={currentPage >= totalPages}
                >
                  {t.paginationNext}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="universe-explorer__empty" role="status">
          {t.emptyFiltered}
        </p>
      )}
    </div>
  );
}

function FilterChip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`universe-explorer__chip${active ? ' universe-explorer__chip--active' : ''}`}
      aria-pressed={active}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}
