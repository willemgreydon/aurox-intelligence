/**
 * Pure filter / sort / summarize logic for the tradable simulation universe.
 *
 * No React, no I/O — operates on lightweight "facts" so it is fully unit-testable
 * and shared by the client explorer component. The component supplies the same
 * facts plus a pre-rendered `node` per item; this module never touches the node.
 */

import type { QuoteFreshnessState } from './quote-freshness-display';

export type UniverseSupport = 'available' | 'simulated' | 'planned' | 'unavailable';
export type UniverseAssetClass = 'stock' | 'etf' | 'crypto';
export type UniversePositionState = 'held' | 'not_held';

export type UniverseItemFacts = {
  /** Stable key (assetId). */
  key: string;
  symbol: string;
  /** Lowercased `${symbol} ${name} ${sector}` used for substring search. */
  searchText: string;
  assetClass: UniverseAssetClass;
  sector: string;
  support: UniverseSupport;
  freshnessState: QuoteFreshnessState;
  isHeld: boolean;
  isWatched: boolean;
  /** Held AND the quote is tradable for simulation. */
  sellable: boolean;
};

export type UniverseFilters = {
  search?: string;
  assetClasses?: UniverseAssetClass[];
  support?: UniverseSupport[];
  positionState?: UniversePositionState[];
  freshness?: QuoteFreshnessState[];
};

export type UniverseSortKey = 'symbol' | 'freshness' | 'support';

export type UniverseSummary = {
  total: number;
  shown: number;
  held: number;
  watchlist: number;
  sellable: number;
  staleOrPartial: number;
  unavailable: number;
  byClass: Record<UniverseAssetClass, number>;
};

// Lower = fresher/healthier, used for the default sort and so the worst-quality
// quotes are easy to surface.
const FRESHNESS_RANK: Record<QuoteFreshnessState, number> = {
  live: 0,
  delayed: 1,
  market_closed: 2,
  stale: 3,
  partial: 4,
  unavailable: 5,
};

const SUPPORT_RANK: Record<UniverseSupport, number> = {
  available: 0,
  simulated: 1,
  planned: 2,
  unavailable: 3,
};

function matchesFilters<T extends UniverseItemFacts>(item: T, filters: UniverseFilters): boolean {
  const search = filters.search?.trim().toLowerCase();
  if (search && !item.searchText.includes(search)) return false;
  if (filters.assetClasses?.length && !filters.assetClasses.includes(item.assetClass)) return false;
  if (filters.support?.length && !filters.support.includes(item.support)) return false;
  if (filters.freshness?.length && !filters.freshness.includes(item.freshnessState)) return false;
  if (filters.positionState?.length) {
    const state: UniversePositionState = item.isHeld ? 'held' : 'not_held';
    if (!filters.positionState.includes(state)) return false;
  }
  return true;
}

export function filterUniverse<T extends UniverseItemFacts>(
  items: readonly T[],
  filters: UniverseFilters,
): T[] {
  return items.filter((item) => matchesFilters(item, filters));
}

export function sortUniverse<T extends UniverseItemFacts>(
  items: readonly T[],
  sort: UniverseSortKey,
): T[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case 'freshness': {
        const diff = FRESHNESS_RANK[a.freshnessState] - FRESHNESS_RANK[b.freshnessState];
        return diff !== 0 ? diff : a.symbol.localeCompare(b.symbol);
      }
      case 'support': {
        const diff = SUPPORT_RANK[a.support] - SUPPORT_RANK[b.support];
        return diff !== 0 ? diff : a.symbol.localeCompare(b.symbol);
      }
      case 'symbol':
      default:
        return a.symbol.localeCompare(b.symbol);
    }
  });
  return copy;
}

export function summarizeUniverse<T extends UniverseItemFacts>(
  all: readonly T[],
  shown: readonly T[],
): UniverseSummary {
  const byClass: Record<UniverseAssetClass, number> = { stock: 0, etf: 0, crypto: 0 };
  let held = 0;
  let watchlist = 0;
  let sellable = 0;
  let staleOrPartial = 0;
  let unavailable = 0;
  for (const item of all) {
    byClass[item.assetClass] += 1;
    if (item.isHeld) held += 1;
    if (item.isWatched) watchlist += 1;
    if (item.sellable) sellable += 1;
    if (item.freshnessState === 'stale' || item.freshnessState === 'partial') staleOrPartial += 1;
    if (item.freshnessState === 'unavailable') unavailable += 1;
  }
  return {
    total: all.length,
    shown: shown.length,
    held,
    watchlist,
    sellable,
    staleOrPartial,
    unavailable,
    byClass,
  };
}

/** Convenience: filter then sort in one call. */
export function applyUniverseView<T extends UniverseItemFacts>(
  items: readonly T[],
  filters: UniverseFilters,
  sort: UniverseSortKey,
): T[] {
  return sortUniverse(filterUniverse(items, filters), sort);
}
