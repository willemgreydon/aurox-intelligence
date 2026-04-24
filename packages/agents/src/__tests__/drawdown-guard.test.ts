import { describe, expect, it } from 'vitest';
import { runDrawdownGuard } from '../risk/drawdown-guard-agent';
import type { AccountCapitalState, BrokerModeConfig } from '../types/broker-types';

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
    maxDrawdownPercent: 0.1,
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

function makeState(drawdown: number): AccountCapitalState {
  return {
    cashBalance: 10_000,
    usedCapitalToday: 1_000,
    openPositionCount: 2,
    currentDrawdownPercent: drawdown,
    dailyLossPercent: 0.01,
    ordersExecutedToday: 2,
    lastOrderAt: new Date().toISOString(),
  };
}

describe('runDrawdownGuard', () => {
  it('approves when drawdown is below configured limit', () => {
    const result = runDrawdownGuard(makeState(0.05), modeConfig);
    expect(result.ok).toBe(true);
  });

  it('blocks when drawdown limit is reached', () => {
    const result = runDrawdownGuard(makeState(0.1), modeConfig);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('DRAWDOWN_GUARD_LIMIT_REACHED');
    }
  });
});

