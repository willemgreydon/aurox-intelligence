import { describe, expect, it } from 'vitest';
import {
  applyUniverseView,
  filterUniverse,
  sortUniverse,
  summarizeUniverse,
  type UniverseItemFacts,
} from './simulation-universe-filter';

function fact(partial: Partial<UniverseItemFacts> & { symbol: string }): UniverseItemFacts {
  return {
    key: partial.key ?? partial.symbol,
    searchText: partial.searchText ?? `${partial.symbol} ${partial.symbol}`.toLowerCase(),
    assetClass: 'stock',
    sector: 'Technology',
    support: 'simulated',
    freshnessState: 'live',
    isHeld: false,
    isWatched: false,
    sellable: false,
    ...partial,
  };
}

const UNIVERSE: UniverseItemFacts[] = [
  fact({ symbol: 'AAPL', searchText: 'aapl apple inc technology', isHeld: true, sellable: true, freshnessState: 'market_closed' }),
  fact({ symbol: 'MSFT', searchText: 'msft microsoft technology', isHeld: true, sellable: true, isWatched: true, freshnessState: 'live' }),
  fact({ symbol: 'SPY', searchText: 'spy s&p etf', assetClass: 'etf', freshnessState: 'delayed' }),
  fact({ symbol: 'BTC', searchText: 'btc bitcoin crypto', assetClass: 'crypto', freshnessState: 'stale', isWatched: true }),
  fact({ symbol: 'PLTR', searchText: 'pltr palantir', support: 'planned', freshnessState: 'unavailable' }),
  fact({ symbol: 'XYZ', searchText: 'xyz unknown', support: 'unavailable', freshnessState: 'partial' }),
];

describe('filterUniverse', () => {
  it('substring search matches symbol or name', () => {
    expect(filterUniverse(UNIVERSE, { search: 'micro' }).map((i) => i.symbol)).toEqual(['MSFT']);
    expect(filterUniverse(UNIVERSE, { search: 'bitcoin' }).map((i) => i.symbol)).toEqual(['BTC']);
  });

  it('filters by asset class', () => {
    expect(filterUniverse(UNIVERSE, { assetClasses: ['crypto'] }).map((i) => i.symbol)).toEqual(['BTC']);
    expect(filterUniverse(UNIVERSE, { assetClasses: ['stock', 'etf'] }).map((i) => i.symbol)).toEqual([
      'AAPL',
      'MSFT',
      'SPY',
      'PLTR',
      'XYZ',
    ]);
  });

  it('filters by support status', () => {
    expect(filterUniverse(UNIVERSE, { support: ['planned'] }).map((i) => i.symbol)).toEqual(['PLTR']);
    expect(filterUniverse(UNIVERSE, { support: ['unavailable'] }).map((i) => i.symbol)).toEqual(['XYZ']);
  });

  it('filters by position state', () => {
    expect(filterUniverse(UNIVERSE, { positionState: ['held'] }).map((i) => i.symbol)).toEqual(['AAPL', 'MSFT']);
    expect(filterUniverse(UNIVERSE, { positionState: ['not_held'] }).map((i) => i.symbol)).toEqual([
      'SPY',
      'BTC',
      'PLTR',
      'XYZ',
    ]);
  });

  it('filters by freshness state', () => {
    expect(filterUniverse(UNIVERSE, { freshness: ['stale', 'partial', 'unavailable'] }).map((i) => i.symbol)).toEqual([
      'BTC',
      'PLTR',
      'XYZ',
    ]);
  });

  it('combines filters (AND semantics)', () => {
    expect(
      filterUniverse(UNIVERSE, { assetClasses: ['stock'], positionState: ['held'] }).map((i) => i.symbol),
    ).toEqual(['AAPL', 'MSFT']);
  });

  it('empty filters returns everything', () => {
    expect(filterUniverse(UNIVERSE, {}).length).toBe(UNIVERSE.length);
  });
});

describe('sortUniverse', () => {
  it('sorts by symbol alphabetically', () => {
    expect(sortUniverse(UNIVERSE, 'symbol').map((i) => i.symbol)).toEqual(['AAPL', 'BTC', 'MSFT', 'PLTR', 'SPY', 'XYZ']);
  });

  it('sorts by freshness health (live first, unavailable last)', () => {
    expect(sortUniverse(UNIVERSE, 'freshness').map((i) => i.symbol)).toEqual([
      'MSFT', // live
      'SPY', // delayed
      'AAPL', // market_closed
      'BTC', // stale
      'XYZ', // partial
      'PLTR', // unavailable
    ]);
  });

  it('does not mutate the input array', () => {
    const before = UNIVERSE.map((i) => i.symbol);
    sortUniverse(UNIVERSE, 'freshness');
    expect(UNIVERSE.map((i) => i.symbol)).toEqual(before);
  });
});

describe('summarizeUniverse', () => {
  it('counts held / watchlist / sellable / stale+partial / unavailable / byClass', () => {
    const summary = summarizeUniverse(UNIVERSE, UNIVERSE);
    expect(summary.total).toBe(6);
    expect(summary.shown).toBe(6);
    expect(summary.held).toBe(2);
    expect(summary.watchlist).toBe(2);
    expect(summary.sellable).toBe(2);
    expect(summary.staleOrPartial).toBe(2); // BTC stale + XYZ partial
    expect(summary.unavailable).toBe(1); // PLTR
    expect(summary.byClass).toEqual({ stock: 4, etf: 1, crypto: 1 });
  });

  it('reports shown separately from total when filtered', () => {
    const shown = filterUniverse(UNIVERSE, { assetClasses: ['crypto'] });
    const summary = summarizeUniverse(UNIVERSE, shown);
    expect(summary.total).toBe(6);
    expect(summary.shown).toBe(1);
  });
});

describe('applyUniverseView', () => {
  it('filters then sorts', () => {
    const result = applyUniverseView(UNIVERSE, { assetClasses: ['stock'] }, 'symbol');
    expect(result.map((i) => i.symbol)).toEqual(['AAPL', 'MSFT', 'PLTR', 'XYZ']);
  });
});
