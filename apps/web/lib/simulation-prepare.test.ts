import { describe, expect, it } from 'vitest';
import { parsePreparedSimulationTicket } from './simulation-prepare';
import { buildSimulationPrepareHref, buildSimulationPrepareHrefForAsset } from './simulation-prepare-url';

describe('simulation prepare url + parser', () => {
  it('builds etf prepare buy url', () => {
    const href = buildSimulationPrepareHref({
      symbol: 'SPY',
      assetClass: 'etf',
      lane: 'manual_multi_asset_lane',
      side: 'buy',
      source: 'etf-lane',
    });
    expect(href).toContain('intent=prepare');
    expect(href).toContain('side=buy');
    expect(href).toContain('assetClass=etf');
    expect(href).toContain('lane=manual_multi_asset_lane');
    expect(href).toContain('source=etf-lane');
  });

  it('builds crypto prepare buy url with provider symbol', () => {
    const href = buildSimulationPrepareHref({
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      lane: 'manual_multi_asset_lane',
      side: 'buy',
      source: 'crypto-lane',
    });
    expect(href).toContain('symbol=BINANCE%3ABTCUSDT');
    expect(href).toContain('assetClass=crypto');
  });

  it('parses case-insensitive side into normalized ticket', () => {
    const parsed = parsePreparedSimulationTicket({
      intent: 'prepare',
      side: 'SELL',
      symbol: 'binance:btcusdt',
      assetClass: 'crypto',
      lane: 'manual_multi_asset_lane',
      source: 'crypto-lane',
    });
    expect(parsed).toEqual({
      intent: 'prepare',
      side: 'sell',
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      lane: 'manual_multi_asset_lane',
      source: 'crypto-lane',
    });
  });

  it('builds prepare-buy href with required lane + assetClass for stocks', () => {
    const href = buildSimulationPrepareHrefForAsset({
      symbol: 'AAPL',
      assetClass: 'stock',
      side: 'buy',
      source: 'signal',
    });
    expect(href).toContain('symbol=AAPL');
    expect(href).toContain('assetClass=stock');
    expect(href).toContain('lane=manual_stock_lane');
    expect(href).toContain('side=buy');
  });

  it('builds prepare-sell href with required lane + assetClass for crypto', () => {
    const href = buildSimulationPrepareHrefForAsset({
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      side: 'sell',
      source: 'signal',
    });
    expect(href).toContain('assetClass=crypto');
    expect(href).toContain('lane=manual_multi_asset_lane');
    expect(href).toContain('side=sell');
  });
});
