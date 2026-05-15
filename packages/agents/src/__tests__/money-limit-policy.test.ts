import { describe, expect, it } from 'vitest';
import {
  checkMoneyLimitPolicy,
  computeAllowedCapital,
  computeAllowedOrderNotional,
} from '../policies/money-limit-policy';
import type { AccountCapitalState, BrokerModeConfig, TradeIntentPayload } from '../types/broker-types';

function makeAccount(overrides: Partial<AccountCapitalState> = {}): AccountCapitalState {
  return {
    cashBalance: 50_000,
    usedCapitalToday: 0,
    openPositionCount: 2,
    currentDrawdownPercent: 0,
    dailyLossPercent: 0,
    ordersExecutedToday: 0,
    lastOrderAt: null,
    ...overrides,
  };
}

const config: BrokerModeConfig = {
  id: 'assisted_confirmation',
  label: 'Assisted Confirmation',
  enabled: true,
  requiresVerifiedUser: false,
  requireHumanApproval: true,
  executionTarget: 'simulation',
  allowedAssetKinds: ['stock', 'etf', 'crypto'],
  capital: { maxAbsolute: 25_000, maxPercentOfCash: 0.25, maxPerTrade: 2_500 },
  risk: {
    maxPositionPercent: 0.10,
    maxOpenPositions: 10,
    maxDailyLossPercent: 0.03,
    maxDrawdownPercent: 0.15,
    minSignalConfidence: 0.55,
  },
  trading: {
    allowScalingIn: true,
    allowScalingOut: true,
    allowOvernight: false,
    allowWeekendCrypto: false,
    maxOrdersPerDay: 20,
    cooldownMinutes: 30,
  },
  approvals: {
    requireFreshConsent: true,
    requireHealthyBrokerConnection: false,
    requireHealthyMarketData: true,
  },
};

function makeIntent(overrides: Partial<TradeIntentPayload> = {}): TradeIntentPayload {
  return {
    accountId: 'acc-1',
    modeId: 'assisted_confirmation',
    source: 'manual',
    symbol: 'AAPL',
    assetKind: 'stock',
    side: 'buy',
    sizingMode: 'notional',
    notional: 1000,
    thesis: 'Buying AAPL for test.',
    confidence: 0.7,
    ...overrides,
  };
}

describe('computeAllowedCapital', () => {
  it('returns the minimum of maxAbsolute and cashBalance * maxPercentOfCash', () => {
    const account = makeAccount({ cashBalance: 50_000 });
    // 50_000 * 0.25 = 12_500 < 25_000
    expect(computeAllowedCapital(config, account)).toBe(12_500);
  });

  it('is capped by maxAbsolute when cashBalance is large', () => {
    const account = makeAccount({ cashBalance: 200_000 });
    // 200_000 * 0.25 = 50_000 > 25_000 → cap at 25_000
    expect(computeAllowedCapital(config, account)).toBe(25_000);
  });
});

describe('computeAllowedOrderNotional', () => {
  it('reduces by usedCapitalToday', () => {
    const account = makeAccount({ cashBalance: 50_000, usedCapitalToday: 5_000 });
    const allowed = computeAllowedCapital(config, account);
    const notional = computeAllowedOrderNotional(config, account, allowed);
    // remaining budget = 12_500 - 5_000 = 7_500; capped by maxPerTrade = 2_500
    expect(notional).toBe(2_500);
  });

  it('returns 0 when daily budget is fully used', () => {
    const account = makeAccount({ cashBalance: 50_000, usedCapitalToday: 20_000 });
    const allowed = computeAllowedCapital(config, account);
    const notional = computeAllowedOrderNotional(config, account, allowed);
    // remaining = 12_500 - 20_000 = negative → clamped to 0
    expect(notional).toBe(0);
  });
});

describe('checkMoneyLimitPolicy', () => {
  it('approves all checks for a well-funded account with room to trade', () => {
    const checks = checkMoneyLimitPolicy(makeIntent(), config, makeAccount());
    const rejections = checks.filter((c) => c.verdict !== 'approved');
    expect(rejections).toHaveLength(0);
  });

  it('rejects cashAvailable check when cash is zero', () => {
    const checks = checkMoneyLimitPolicy(makeIntent(), config, makeAccount({ cashBalance: 0 }));
    const cash = checks.find((c) => c.checkId === 'money.cashAvailable');
    expect(cash?.verdict).toBe('rejected');
  });

  it('rejects orderBudget check when intent notional exceeds allowed order budget', () => {
    const oversizedIntent = makeIntent({ notional: 10_000 });
    const checks = checkMoneyLimitPolicy(oversizedIntent, config, makeAccount());
    const budgetCheck = checks.find((c) => c.checkId === 'money.orderBudget');
    expect(budgetCheck?.verdict).toBe('rejected');
  });

  it('approves orderBudget when notional is within the allowed order budget', () => {
    const smallIntent = makeIntent({ notional: 500 });
    const checks = checkMoneyLimitPolicy(smallIntent, config, makeAccount());
    const budgetCheck = checks.find((c) => c.checkId === 'money.orderBudget');
    expect(budgetCheck?.verdict).toBe('approved');
  });

  it('rejects positionCap when open positions hit the limit', () => {
    const fullAccount = makeAccount({ openPositionCount: 10 });
    const checks = checkMoneyLimitPolicy(makeIntent(), config, fullAccount);
    const capCheck = checks.find((c) => c.checkId === 'money.positionCap');
    expect(capCheck?.verdict).toBe('rejected');
  });

  it('does not include orderBudget check when notional is undefined', () => {
    const quantityIntent = makeIntent({ notional: undefined, sizingMode: 'quantity', quantity: 5 });
    const checks = checkMoneyLimitPolicy(quantityIntent, config, makeAccount());
    const budgetCheck = checks.find((c) => c.checkId === 'money.orderBudget');
    expect(budgetCheck).toBeUndefined();
  });

  // Sell-side checks: sells must pass all money checks regardless of cash/capital state.

  it('approves cashAvailable for a sell even when cash balance is zero', () => {
    const sellIntent = makeIntent({ side: 'sell', notional: 1000 });
    const checks = checkMoneyLimitPolicy(sellIntent, config, makeAccount({ cashBalance: 0 }));
    const cashCheck = checks.find((c) => c.checkId === 'money.cashAvailable');
    expect(cashCheck?.verdict).toBe('approved');
  });

  it('approves capitalEnvelope for a sell even when envelope is exhausted', () => {
    // usedCapitalToday far exceeds envelope — buy would be blocked, sell must not be.
    const sellIntent = makeIntent({ side: 'sell', notional: 500 });
    const exhaustedAccount = makeAccount({ cashBalance: 0, usedCapitalToday: 50_000 });
    const checks = checkMoneyLimitPolicy(sellIntent, config, exhaustedAccount);
    const envelopeCheck = checks.find((c) => c.checkId === 'money.capitalEnvelope');
    expect(envelopeCheck?.verdict).toBe('approved');
  });

  it('approves orderBudget for a sell even when notional exceeds the buy daily budget', () => {
    // A sell of 10_000 notional is a capital return, not a capital outflow — should be approved.
    const largeSellIntent = makeIntent({ side: 'sell', notional: 10_000 });
    const checks = checkMoneyLimitPolicy(largeSellIntent, config, makeAccount());
    const budgetCheck = checks.find((c) => c.checkId === 'money.orderBudget');
    expect(budgetCheck?.verdict).toBe('approved');
  });

  it('approves positionCap for a sell even when position limit is at maximum', () => {
    // Sells close positions — they do not increase position count.
    const sellIntent = makeIntent({ side: 'sell', notional: 500 });
    const fullAccount = makeAccount({ openPositionCount: 10 }); // at the 10-position cap
    const checks = checkMoneyLimitPolicy(sellIntent, config, fullAccount);
    const capCheck = checks.find((c) => c.checkId === 'money.positionCap');
    expect(capCheck?.verdict).toBe('approved');
  });

  it('approves all checks for a sell in a worst-case depleted account', () => {
    // Simulate an account where all cash is gone and the daily budget is exhausted.
    const sellIntent = makeIntent({ side: 'sell', notional: 2000 });
    const depletedAccount = makeAccount({
      cashBalance: 0,
      usedCapitalToday: 100_000,
      openPositionCount: 10,
    });
    const checks = checkMoneyLimitPolicy(sellIntent, config, depletedAccount);
    const rejections = checks.filter((c) => c.verdict === 'rejected');
    expect(rejections).toHaveLength(0);
  });

  it('buy checks still reject correctly when cash is zero (buy-side behavior unchanged)', () => {
    const buyIntent = makeIntent({ side: 'buy', notional: 1000 });
    const checks = checkMoneyLimitPolicy(buyIntent, config, makeAccount({ cashBalance: 0 }));
    const cashCheck = checks.find((c) => c.checkId === 'money.cashAvailable');
    expect(cashCheck?.verdict).toBe('rejected');
  });
});
