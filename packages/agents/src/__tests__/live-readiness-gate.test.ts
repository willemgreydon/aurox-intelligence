import { describe, expect, it } from 'vitest';
import { checkLiveReadiness } from '../readiness/live-readiness-gate';
import type { LiveReadinessContext } from '../readiness/live-readiness-gate';
import type { BrokerModeConfig } from '../types/broker-types';

const simulationConfig: BrokerModeConfig = {
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

const liveConfig: BrokerModeConfig = {
  ...simulationConfig,
  id: 'guardrailed_auto_live',
  label: 'Guardrailed Auto Live',
  enabled: true,
  requiresVerifiedUser: true,
  executionTarget: 'live',
  approvals: {
    requireFreshConsent: true,
    requireHealthyBrokerConnection: true,
    requireHealthyMarketData: true,
  },
};

const healthyContext: LiveReadinessContext = {
  isUserVerified: true,
  hasBrokerConnection: true,
  isMarketDataHealthy: true,
  hasSimulationHistory: true,
  isReadOnlyMode: false,
};

describe('checkLiveReadiness — simulation mode', () => {
  it('is ready when mode is enabled (no strict gates for simulation mode 1)', () => {
    const result = checkLiveReadiness(simulationConfig, {
      ...healthyContext,
      isUserVerified: false,
      hasBrokerConnection: false,
    });

    expect(result.ready).toBe(true);
    expect(result.modeId).toBe('manual_only');
    expect(result.executionTarget).toBe('simulation');
  });

  it('is not ready when mode is disabled', () => {
    const disabledConfig = { ...simulationConfig, enabled: false };
    const result = checkLiveReadiness(disabledConfig, healthyContext);

    expect(result.ready).toBe(false);
    const enabledCheck = result.checks.find((c) => c.id === 'mode_enabled');
    expect(enabledCheck?.passed).toBe(false);
  });
});

describe('checkLiveReadiness — live mode', () => {
  it('is ready when all live gates pass', () => {
    const result = checkLiveReadiness(liveConfig, healthyContext);

    expect(result.ready).toBe(true);
    expect(result.executionTarget).toBe('live');
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it('is not ready when user is not verified', () => {
    const result = checkLiveReadiness(liveConfig, { ...healthyContext, isUserVerified: false });

    expect(result.ready).toBe(false);
    const check = result.checks.find((c) => c.id === 'user_verified');
    expect(check?.passed).toBe(false);
  });

  it('is not ready when broker connection is missing', () => {
    const result = checkLiveReadiness(liveConfig, { ...healthyContext, hasBrokerConnection: false });

    expect(result.ready).toBe(false);
    const check = result.checks.find((c) => c.id === 'broker_connection');
    expect(check?.passed).toBe(false);
  });

  it('is not ready when market data feed is unhealthy', () => {
    const result = checkLiveReadiness(liveConfig, { ...healthyContext, isMarketDataHealthy: false });

    expect(result.ready).toBe(false);
    const check = result.checks.find((c) => c.id === 'market_data');
    expect(check?.passed).toBe(false);
  });

  it('is not ready when simulation history is absent', () => {
    const result = checkLiveReadiness(liveConfig, { ...healthyContext, hasSimulationHistory: false });

    expect(result.ready).toBe(false);
    const check = result.checks.find((c) => c.id === 'simulation_proven');
    expect(check?.passed).toBe(false);
  });

  it('is not ready when in read-only mode', () => {
    const result = checkLiveReadiness(liveConfig, { ...healthyContext, isReadOnlyMode: true });

    expect(result.ready).toBe(false);
    const check = result.checks.find((c) => c.id === 'trading_active');
    expect(check?.passed).toBe(false);
  });

  it('does not include user_verified check for non-requiring modes', () => {
    const noVerifyConfig = { ...liveConfig, requiresVerifiedUser: false };
    const result = checkLiveReadiness(noVerifyConfig, { ...healthyContext, isUserVerified: false });

    const check = result.checks.find((c) => c.id === 'user_verified');
    expect(check).toBeUndefined();
  });

  it('carries correct modeId and modeLabel in result', () => {
    const result = checkLiveReadiness(liveConfig, healthyContext);

    expect(result.modeId).toBe('guardrailed_auto_live');
    expect(result.modeLabel).toBe('Guardrailed Auto Live');
  });
});
