import type { BrokerModeConfig } from '@repo/agents';

type BrokerModeEntry = {
  readonly config: BrokerModeConfig;
  readonly tier: number;
  readonly laneHref: string | null;
};

export const BROKER_MODE_REGISTRY: readonly BrokerModeEntry[] = [
  {
    tier: 1,
    laneHref: '/invest/simulation?lane=manual_stock_lane',
    config: {
      id: 'manual_only',
      label: 'Manual Only',
      enabled: true,
      requiresVerifiedUser: false,
      requireHumanApproval: true,
      executionTarget: 'simulation',
      allowedAssetKinds: ['stock', 'etf', 'crypto'],
      capital: { maxAbsolute: 100000, maxPercentOfCash: 1.0, maxPerTrade: 100000 },
      risk: { maxPositionPercent: 1.0, maxOpenPositions: 50, maxDailyLossPercent: 1.0, maxDrawdownPercent: 1.0, minSignalConfidence: 0.0 },
      trading: { allowScalingIn: true, allowScalingOut: true, allowOvernight: true, allowWeekendCrypto: true, maxOrdersPerDay: 1000, cooldownMinutes: 0 },
      approvals: { requireFreshConsent: false, requireHealthyBrokerConnection: false, requireHealthyMarketData: false },
    },
  },
  {
    tier: 2,
    laneHref: '/invest/simulation?lane=ai_copilot_lane',
    config: {
      id: 'assisted_confirmation',
      label: 'Assisted Confirmation',
      enabled: true,
      requiresVerifiedUser: false,
      requireHumanApproval: true,
      executionTarget: 'simulation',
      allowedAssetKinds: ['stock', 'etf', 'crypto'],
      capital: { maxAbsolute: 25000, maxPercentOfCash: 0.25, maxPerTrade: 2500 },
      risk: { maxPositionPercent: 0.10, maxOpenPositions: 10, maxDailyLossPercent: 0.03, maxDrawdownPercent: 0.15, minSignalConfidence: 0.55 },
      trading: { allowScalingIn: true, allowScalingOut: true, allowOvernight: false, allowWeekendCrypto: false, maxOrdersPerDay: 20, cooldownMinutes: 30 },
      approvals: { requireFreshConsent: true, requireHealthyBrokerConnection: false, requireHealthyMarketData: true },
    },
  },
  {
    tier: 3,
    laneHref: '/invest/simulation?lane=signal_follow_lane',
    config: {
      id: 'guided_auto_simulation',
      label: 'Guided Auto (Simulation)',
      enabled: true,
      requiresVerifiedUser: false,
      requireHumanApproval: false,
      executionTarget: 'simulation',
      allowedAssetKinds: ['stock'],
      capital: { maxAbsolute: 10000, maxPercentOfCash: 0.10, maxPerTrade: 1000, microTradingBudget: 500 },
      risk: { maxPositionPercent: 0.08, maxOpenPositions: 6, maxDailyLossPercent: 0.02, maxDrawdownPercent: 0.10, minSignalConfidence: 0.65, maxVolatilityZScore: 2.5 },
      trading: { allowScalingIn: true, allowScalingOut: true, allowOvernight: false, allowWeekendCrypto: false, maxOrdersPerDay: 8, cooldownMinutes: 60 },
      approvals: { requireFreshConsent: true, requireHealthyBrokerConnection: false, requireHealthyMarketData: true },
    },
  },
  {
    tier: 4,
    laneHref: null,
    config: {
      id: 'guardrailed_auto_live',
      label: 'Guardrailed Auto Live',
      enabled: false,
      requiresVerifiedUser: true,
      requireHumanApproval: false,
      executionTarget: 'live',
      allowedAssetKinds: ['stock', 'etf', 'crypto'],
      capital: { maxAbsolute: 2500, maxPercentOfCash: 0.25, maxPerTrade: 350, microTradingBudget: 150 },
      risk: { maxPositionPercent: 0.08, maxOpenPositions: 6, maxDailyLossPercent: 0.025, maxDrawdownPercent: 0.10, minSignalConfidence: 0.72, maxVolatilityZScore: 2.2 },
      trading: { allowScalingIn: true, allowScalingOut: true, allowOvernight: false, allowWeekendCrypto: true, maxOrdersPerDay: 12, cooldownMinutes: 20 },
      approvals: { requireFreshConsent: true, requireHealthyBrokerConnection: true, requireHealthyMarketData: true },
    },
  },
  {
    tier: 5,
    laneHref: null,
    config: {
      id: 'micro_trading',
      label: 'Micro Trading Mode',
      enabled: false,
      requiresVerifiedUser: true,
      requireHumanApproval: false,
      executionTarget: 'simulation',
      allowedAssetKinds: ['stock', 'crypto'],
      capital: { maxAbsolute: 1000, maxPercentOfCash: 0.05, maxPerTrade: 100, microTradingBudget: 100 },
      risk: { maxPositionPercent: 0.03, maxOpenPositions: 3, maxDailyLossPercent: 0.01, maxDrawdownPercent: 0.05, minSignalConfidence: 0.75, maxVolatilityZScore: 1.8 },
      trading: { allowScalingIn: false, allowScalingOut: true, allowOvernight: false, allowWeekendCrypto: false, maxOrdersPerDay: 5, cooldownMinutes: 120 },
      approvals: { requireFreshConsent: true, requireHealthyBrokerConnection: false, requireHealthyMarketData: true },
    },
  },
];

export function getBrokerModeConfig(modeId: string): BrokerModeConfig | null {
  return BROKER_MODE_REGISTRY.find((m) => m.config.id === modeId)?.config ?? null;
}
