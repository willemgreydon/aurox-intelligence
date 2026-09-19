import { describe, expect, it } from 'vitest';
import { mapPositionItems } from './portfolio-mapper';
import type { PortfolioReadModel } from '../queries/portfolio-query';

type PositionRow = NonNullable<PortfolioReadModel['workstation']['workspace']>['positions'][number];

function makePosition(overrides: Partial<PositionRow> = {}): PositionRow {
  return {
    id: 'pos-1',
    assetId: 'asset-1',
    symbol: 'AAPL',
    assetClass: 'stock',
    quantity: 3,
    averageCost: 100,
    marketPrice: 150,
    marketValue: 450,
    costBasis: 300,
    unrealizedPnl: 150,
    realizedPnl: 0,
    openedAt: '2026-01-01T00:00:00.000Z',
    closedAt: null,
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

const readModel = {
  sparklineBySymbol: {},
  assetBySymbol: new Map(),
  watchedAssetIds: new Set<string>(),
} as unknown as PortfolioReadModel;

describe('mapPositionItems — pricedFromCostBasis degraded flag', () => {
  it('does NOT flag a position that has a usable live quote', () => {
    const [item] = mapPositionItems([makePosition()], readModel);
    expect(item.marketPrice).toBe(150);
    expect(item.pricedFromCostBasis).toBe(false);
  });

  it('flags an open position valued at cost basis (no usable quote) — not a live $0 P&L', () => {
    // Repository degraded valuation: marketPrice null, marketValue === costBasis,
    // unrealizedPnl 0. Without the flag this reads as a flat/breakeven live value.
    const [item] = mapPositionItems(
      [makePosition({ marketPrice: null, marketValue: 300, costBasis: 300, unrealizedPnl: 0 })],
      readModel,
    );
    expect(item.marketPrice).toBeNull();
    expect(item.pricedFromCostBasis).toBe(true);
  });

  it('does not flag a zero-quantity position as degraded', () => {
    const [item] = mapPositionItems(
      [makePosition({ quantity: 0, marketPrice: null, marketValue: 0, costBasis: 0, unrealizedPnl: 0 })],
      readModel,
    );
    expect(item.pricedFromCostBasis).toBe(false);
  });
});
