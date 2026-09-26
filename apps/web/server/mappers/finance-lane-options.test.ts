import { describe, expect, it } from 'vitest';
import { mapInvestmentUniverseToLaneOptions, type LaneUniverseAsset } from './finance-mapper';

const asset = (over: Partial<LaneUniverseAsset>): LaneUniverseAsset => ({
  assetId: 'stock-aaa',
  symbol: 'AAA',
  name: 'Alpha',
  assetClass: 'stock',
  actionAvailability: 'available',
  isSimulated: true,
  ...over,
});

describe('mapInvestmentUniverseToLaneOptions', () => {
  it('keeps only simulation-tradable, actionable assets', () => {
    const universe = [
      asset({ assetId: 'stock-a', symbol: 'A', isSimulated: true, actionAvailability: 'available' }),
      asset({ assetId: 'stock-b', symbol: 'B', isSimulated: true, actionAvailability: 'simulated' }),
      asset({ assetId: 'stock-c', symbol: 'C', isSimulated: true, actionAvailability: 'planned' }),
      asset({ assetId: 'stock-d', symbol: 'D', isSimulated: false, actionAvailability: 'available' }),
      asset({ assetId: 'stock-e', symbol: 'E', isSimulated: true, actionAvailability: 'unavailable' }),
    ];
    const result = mapInvestmentUniverseToLaneOptions(universe);
    expect(result.map((option) => option.symbol)).toEqual(['A', 'B']);
    expect(result.every((option) => option.canGenerateActivity)).toBe(true);
  });

  it('sorts by asset class (stock → etf → crypto) then symbol', () => {
    const universe = [
      asset({ assetId: 'crypto-btc', symbol: 'BTCUSDT', assetClass: 'crypto' }),
      asset({ assetId: 'etf-spy', symbol: 'SPY', assetClass: 'etf' }),
      asset({ assetId: 'stock-msft', symbol: 'MSFT', assetClass: 'stock' }),
      asset({ assetId: 'stock-aapl', symbol: 'AAPL', assetClass: 'stock' }),
      asset({ assetId: 'etf-qqq', symbol: 'QQQ', assetClass: 'etf' }),
    ];
    const result = mapInvestmentUniverseToLaneOptions(universe);
    expect(result.map((option) => `${option.assetClass}:${option.symbol}`)).toEqual([
      'stock:AAPL',
      'stock:MSFT',
      'etf:QQQ',
      'etf:SPY',
      'crypto:BTCUSDT',
    ]);
  });

  it('projects only the lane-option fields (name preserved for search)', () => {
    const result = mapInvestmentUniverseToLaneOptions([asset({ name: 'Apple Inc.' })]);
    expect(result[0]).toEqual({
      assetId: 'stock-aaa',
      symbol: 'AAA',
      name: 'Apple Inc.',
      assetClass: 'stock',
      canGenerateActivity: true,
    });
  });

  it('returns an empty array for an empty universe', () => {
    expect(mapInvestmentUniverseToLaneOptions([])).toEqual([]);
  });
});
