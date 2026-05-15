import { describe, expect, it } from 'vitest';
import { buildAccountCapitalState, runCapitalGuard } from '../risk/capital-guard-agent';
import type { SimulationAccountSummary, SimulationOrder } from '@repo/api-contracts';
import type { BrokerModeConfig } from '../types/broker-types';

function makeSummary(overrides: Partial<SimulationAccountSummary> = {}): SimulationAccountSummary {
  return {
    accountId: 'acc-1',
    portfolioId: 'port-1',
    currency: 'USD',
    quoteCurrency: 'USD',
    fxConversionAvailable: false,
    fxConversionNote: 'No FX conversion available.',
    initialCashBalance: 100_000,
    cashBalance: 100_000,
    reservedCash: 0,
    availableCash: 100_000,
    investedCapital: 0,
    portfolioValue: 0,
    equityValue: 100_000,
    unrealizedPnl: 0,
    realizedPnl: 0,
    buyingPower: 100_000,
    activeInvestmentCount: 0,
    closedInvestmentCount: 0,
    positionCount: 0,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeOrder(overrides: Partial<SimulationOrder> = {}): SimulationOrder {
  const today = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    assetId: 'asset-1',
    symbol: 'AAPL',
    assetClass: 'stock',
    side: 'buy',
    status: 'filled',
    quantity: 10,
    requestedPrice: 150,
    executedPrice: 150,
    grossAmount: 1500,
    cashEffect: -1500,
    realizedPnl: 0,
    notes: null,
    createdAt: today,
    executedAt: today,
    ...overrides,
  };
}

const modeConfig: BrokerModeConfig = {
  id: 'manual_only',
  label: 'Manual Only',
  enabled: true,
  requiresVerifiedUser: false,
  requireHumanApproval: true,
  executionTarget: 'simulation',
  allowedAssetKinds: ['stock', 'etf', 'crypto'],
  capital: { maxAbsolute: 100_000, maxPercentOfCash: 1.0, maxPerTrade: 100_000 },
  risk: {
    maxPositionPercent: 1.0,
    maxOpenPositions: 50,
    maxDailyLossPercent: 1.0,
    maxDrawdownPercent: 1.0,
    minSignalConfidence: 0.0,
  },
  trading: {
    allowScalingIn: true,
    allowScalingOut: true,
    allowOvernight: true,
    allowWeekendCrypto: true,
    maxOrdersPerDay: 1000,
    cooldownMinutes: 0,
  },
  approvals: {
    requireFreshConsent: false,
    requireHealthyBrokerConnection: false,
    requireHealthyMarketData: false,
  },
};

describe('buildAccountCapitalState', () => {
  it('returns zero daily values when no orders today', () => {
    const summary = makeSummary({ cashBalance: 95_000, equityValue: 95_000 });
    const state = buildAccountCapitalState(summary, []);

    expect(state.cashBalance).toBe(95_000);
    expect(state.usedCapitalToday).toBe(0);
    expect(state.ordersExecutedToday).toBe(0);
    expect(state.dailyLossPercent).toBe(0);
  });

  it('accumulates buy notional as usedCapitalToday', () => {
    const order1 = makeOrder({ grossAmount: 2000 });
    const order2 = makeOrder({ grossAmount: 3000 });
    const state = buildAccountCapitalState(makeSummary(), [order1, order2]);

    expect(state.usedCapitalToday).toBe(5000);
    expect(state.ordersExecutedToday).toBe(2);
  });

  it('ignores buy orders from previous days', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const oldOrder = makeOrder({ grossAmount: 5000, createdAt: yesterday, executedAt: yesterday });
    const state = buildAccountCapitalState(makeSummary(), [oldOrder]);

    expect(state.usedCapitalToday).toBe(0);
    expect(state.ordersExecutedToday).toBe(0);
  });

  it('computes currentDrawdownPercent from equity vs initial cash', () => {
    const summary = makeSummary({ initialCashBalance: 100_000, equityValue: 90_000 });
    const state = buildAccountCapitalState(summary, []);

    expect(state.currentDrawdownPercent).toBeCloseTo(0.1);
  });

  it('computes dailyLossPercent from negative realized PnL today', () => {
    const order = makeOrder({ side: 'sell', realizedPnl: -2500, grossAmount: 0 });
    const state = buildAccountCapitalState(makeSummary({ initialCashBalance: 100_000 }), [order]);

    expect(state.dailyLossPercent).toBeCloseTo(0.025);
  });

  it('does not set dailyLossPercent for positive PnL', () => {
    const order = makeOrder({ side: 'sell', realizedPnl: 1000, grossAmount: 0 });
    const state = buildAccountCapitalState(makeSummary(), [order]);

    expect(state.dailyLossPercent).toBe(0);
  });
});

describe('runCapitalGuard', () => {
  it('approves when account has cash and capital envelope is available', () => {
    const result = runCapitalGuard(makeSummary({ cashBalance: 50_000 }), [], modeConfig);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.allowedCapital).toBeGreaterThan(0);
      expect(result.value.allowedOrderNotional).toBeGreaterThan(0);
    }
  });

  it('rejects when cash balance is zero', () => {
    const result = runCapitalGuard(makeSummary({ cashBalance: 0 }), [], modeConfig);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('CAPITAL_GUARD_NO_CASH');
    }
  });

  it('rejects when capital envelope is exhausted by daily usage', () => {
    const tightConfig: BrokerModeConfig = {
      ...modeConfig,
      capital: { maxAbsolute: 1000, maxPercentOfCash: 0.01, maxPerTrade: 500 },
    };
    const bigOrder = makeOrder({ grossAmount: 5000 });
    const result = runCapitalGuard(makeSummary({ cashBalance: 50_000 }), [bigOrder], tightConfig);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('CAPITAL_GUARD_ENVELOPE_EXHAUSTED');
    }
  });

  it('allowedOrderNotional is capped by maxPerTrade', () => {
    const cappedConfig: BrokerModeConfig = {
      ...modeConfig,
      capital: { maxAbsolute: 100_000, maxPercentOfCash: 1.0, maxPerTrade: 250 },
    };
    const result = runCapitalGuard(makeSummary({ cashBalance: 50_000 }), [], cappedConfig);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.allowedOrderNotional).toBe(250);
    }
  });

  it('rejects when usedCapitalToday exactly equals allowedCapital (boundary exhaustion)', () => {
    // maxAbsolute=1000, maxPercentOfCash=0.02, cashBalance=50_000
    // allowedCapital = min(1000, 50_000 * 0.02) = min(1000, 1000) = 1000
    // usedCapitalToday = 1000 → remaining = 0 → should reject
    const boundaryConfig: BrokerModeConfig = {
      ...modeConfig,
      capital: { maxAbsolute: 1000, maxPercentOfCash: 0.02, maxPerTrade: 1000 },
    };
    const exactOrder = makeOrder({ grossAmount: 1000 });
    const result = runCapitalGuard(makeSummary({ cashBalance: 50_000 }), [exactOrder], boundaryConfig);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('CAPITAL_GUARD_ENVELOPE_EXHAUSTED');
    }
  });

  it('approves with reduced allowedOrderNotional when envelope is partially used', () => {
    // allowedCapital = min(1000, 50_000 * 0.02) = 1000
    // usedCapitalToday = 600 → remaining = 400; capped by maxPerTrade=1000 → 400
    const partialConfig: BrokerModeConfig = {
      ...modeConfig,
      capital: { maxAbsolute: 1000, maxPercentOfCash: 0.02, maxPerTrade: 1000 },
    };
    const partialOrder = makeOrder({ grossAmount: 600 });
    const result = runCapitalGuard(makeSummary({ cashBalance: 50_000 }), [partialOrder], partialConfig);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.allowedOrderNotional).toBe(400);
    }
  });

  it('rejects when usedCapitalToday far exceeds the envelope (over-spending guard)', () => {
    // Edge: past orders consumed more than the configured cap (e.g. cap was lowered after orders)
    const shrunkConfig: BrokerModeConfig = {
      ...modeConfig,
      capital: { maxAbsolute: 100, maxPercentOfCash: 0.001, maxPerTrade: 100 },
    };
    const largeOrder = makeOrder({ grossAmount: 10_000 });
    const result = runCapitalGuard(makeSummary({ cashBalance: 50_000 }), [largeOrder], shrunkConfig);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('CAPITAL_GUARD_ENVELOPE_EXHAUSTED');
    }
  });

  // Sell-side tests: sells produce cash and must not be gated by buy-capital checks.

  it('approves sell when cash balance is zero (sells do not need cash to proceed)', () => {
    const result = runCapitalGuard(makeSummary({ cashBalance: 0 }), [], modeConfig, 'sell');

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Sell guard returns Infinity sentinels so resolveQuantity uses the intent's own sizing.
      expect(result.value.allowedCapital).toBe(Infinity);
      expect(result.value.allowedOrderNotional).toBe(Infinity);
    }
  });

  it('approves sell when buy capital envelope is fully exhausted by prior buys', () => {
    // Capital is completely used up by prior buy orders — but sells should still be allowed.
    const tightConfig: BrokerModeConfig = {
      ...modeConfig,
      capital: { maxAbsolute: 100, maxPercentOfCash: 0.001, maxPerTrade: 100 },
    };
    const bigBuyOrder = makeOrder({ grossAmount: 10_000 }); // exhausts envelope
    const result = runCapitalGuard(
      makeSummary({ cashBalance: 0 }), // cash is also depleted
      [bigBuyOrder],
      tightConfig,
      'sell',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.allowedOrderNotional).toBe(Infinity);
    }
  });

  it('sell guard still builds valid account state (for drawdown/loss checks downstream)', () => {
    const sellOrder = makeOrder({ side: 'sell', realizedPnl: -500, grossAmount: 0 });
    const result = runCapitalGuard(makeSummary({ cashBalance: 0 }), [sellOrder], modeConfig, 'sell');

    expect(result.ok).toBe(true);
    if (result.ok) {
      // State should be populated correctly — drawdown/loss checks use it downstream.
      expect(result.value.state.cashBalance).toBe(0);
      expect(result.value.state.dailyLossPercent).toBeCloseTo(0.005); // 500 / 100_000
    }
  });

  it('buy still rejects when cash is zero (buy-side behavior unchanged)', () => {
    const result = runCapitalGuard(makeSummary({ cashBalance: 0 }), [], modeConfig, 'buy');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('CAPITAL_GUARD_NO_CASH');
    }
  });
});
