import { describe, expect, it } from 'vitest';
import { runPositionLimitAgent } from '../risk/position-limit-agent';
import type { SimulationPosition } from '@repo/api-contracts';
import type { BrokerModeConfig, TradeIntentPayload } from '../types/broker-types';

function makePosition(symbol: string, marketValue: number, closedAt: string | null = null): SimulationPosition {
  return {
    id: crypto.randomUUID(),
    assetId: `asset-${symbol}`,
    symbol,
    assetClass: 'stock',
    quantity: 10,
    averageCost: marketValue / 10,
    marketPrice: marketValue / 10,
    marketValue,
    costBasis: marketValue,
    unrealizedPnl: 0,
    realizedPnl: 0,
    openedAt: new Date().toISOString(),
    closedAt,
    updatedAt: new Date().toISOString(),
  };
}

const config: BrokerModeConfig = {
  id: 'guided_auto_simulation',
  label: 'Guided Auto (Simulation)',
  enabled: true,
  requiresVerifiedUser: false,
  requireHumanApproval: false,
  executionTarget: 'simulation',
  allowedAssetKinds: ['stock'],
  capital: { maxAbsolute: 10_000, maxPercentOfCash: 0.10, maxPerTrade: 1_000 },
  risk: {
    maxPositionPercent: 0.08,
    maxOpenPositions: 6,
    maxDailyLossPercent: 0.02,
    maxDrawdownPercent: 0.10,
    minSignalConfidence: 0.65,
  },
  trading: {
    allowScalingIn: true,
    allowScalingOut: true,
    allowOvernight: false,
    allowWeekendCrypto: false,
    maxOrdersPerDay: 8,
    cooldownMinutes: 60,
  },
  approvals: {
    requireFreshConsent: true,
    requireHealthyBrokerConnection: false,
    requireHealthyMarketData: true,
  },
};

function makeIntent(symbol: string, notional?: number): TradeIntentPayload {
  return {
    accountId: 'acc-1',
    modeId: 'guided_auto_simulation',
    source: 'manual',
    symbol,
    assetKind: 'stock',
    side: 'buy',
    sizingMode: notional !== undefined ? 'notional' : 'quantity',
    ...(notional !== undefined ? { notional } : { quantity: 5 }),
    thesis: 'Test trade.',
    confidence: 0.7,
  };
}

describe('runPositionLimitAgent', () => {
  it('approves when positions are below the open position limit', () => {
    const positions = [makePosition('AAPL', 1000), makePosition('MSFT', 800)];
    const result = runPositionLimitAgent(positions, config, makeIntent('GOOG'), 10_000);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const maxOpen = result.value.find((c) => c.checkId === 'position.maxOpen');
      expect(maxOpen?.verdict).toBe('approved');
    }
  });

  it('rejects when open position count equals the limit', () => {
    const positions = Array.from({ length: 6 }, (_, i) => makePosition(`STOCK${i}`, 500));
    const result = runPositionLimitAgent(positions, config, makeIntent('NEW'), 10_000);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const maxOpen = result.value.find((c) => c.checkId === 'position.maxOpen');
      expect(maxOpen?.verdict).toBe('rejected');
    }
  });

  it('ignores closed positions when counting open positions', () => {
    const closed = makePosition('CLOSED', 500, new Date().toISOString());
    const open = makePosition('OPEN', 500);
    const result = runPositionLimitAgent([closed, open], config, makeIntent('NEW'), 10_000);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const maxOpen = result.value.find((c) => c.checkId === 'position.maxOpen');
      expect(maxOpen?.verdict).toBe('approved');
    }
  });

  it('rejects concentration check when projected position exceeds the limit', () => {
    const positions = [makePosition('AAPL', 500)];
    const portfolioValue = 10_000;
    // Existing AAPL = 500, adding 400 notional = 900 / 10_000 = 9% > 8% limit
    const result = runPositionLimitAgent(positions, config, makeIntent('AAPL', 400), portfolioValue);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const concentration = result.value.find((c) => c.checkId === 'position.concentration');
      expect(concentration?.verdict).toBe('rejected');
    }
  });

  it('approves concentration check when projected position is within the limit', () => {
    const positions = [makePosition('AAPL', 300)];
    const portfolioValue = 10_000;
    // Existing AAPL = 300, adding 200 = 500 / 10_000 = 5% < 8%
    const result = runPositionLimitAgent(positions, config, makeIntent('AAPL', 200), portfolioValue);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const concentration = result.value.find((c) => c.checkId === 'position.concentration');
      expect(concentration?.verdict).toBe('approved');
    }
  });

  it('skips concentration check when intent has no notional', () => {
    const result = runPositionLimitAgent([], config, makeIntent('AAPL'), 10_000);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const concentration = result.value.find((c) => c.checkId === 'position.concentration');
      expect(concentration).toBeUndefined();
    }
  });
});
