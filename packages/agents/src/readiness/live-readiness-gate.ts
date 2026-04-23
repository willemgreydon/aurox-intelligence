import type { BrokerModeConfig } from '../types/broker-types';

export interface LiveReadinessContext {
  readonly isUserVerified: boolean;
  readonly hasBrokerConnection: boolean;
  readonly isMarketDataHealthy: boolean;
  readonly hasSimulationHistory: boolean;
  readonly isReadOnlyMode: boolean;
}

export interface LiveReadinessCheck {
  readonly id: string;
  readonly label: string;
  readonly passed: boolean;
  readonly reason: string;
  readonly severity: 'info' | 'warning' | 'critical';
}

export interface LiveReadinessResult {
  readonly modeId: string;
  readonly modeLabel: string;
  readonly executionTarget: 'simulation' | 'live';
  readonly ready: boolean;
  readonly blockingCheckCount: number;
  readonly checks: readonly LiveReadinessCheck[];
}

function pushCheck(
  checks: LiveReadinessCheck[],
  check: Omit<LiveReadinessCheck, 'severity'> & { severity?: LiveReadinessCheck['severity'] },
): void {
  checks.push({
    severity: check.severity ?? 'info',
    ...check,
  });
}

export function checkLiveReadiness(
  config: BrokerModeConfig,
  context: LiveReadinessContext,
): LiveReadinessResult {
  const checks: LiveReadinessCheck[] = [];

  pushCheck(checks, {
    id: 'mode_enabled',
    label: 'Mode enabled',
    passed: config.enabled,
    severity: config.executionTarget === 'live' ? 'critical' : 'warning',
    reason: config.enabled
      ? 'Mode is active and available for evaluation.'
      : 'Mode is disabled and cannot be activated yet.',
  });

  if (config.requiresVerifiedUser) {
    pushCheck(checks, {
      id: 'user_verified',
      label: 'Verified user',
      passed: context.isUserVerified,
      severity: 'critical',
      reason: context.isUserVerified
        ? 'User verification is complete.'
        : 'Verified user status is required before this mode can be activated.',
    });
  }

  if (config.approvals.requireHealthyBrokerConnection) {
    pushCheck(checks, {
      id: 'broker_connection',
      label: 'Broker connection',
      passed: context.hasBrokerConnection,
      severity: 'critical',
      reason: context.hasBrokerConnection
        ? 'Broker connection is healthy.'
        : 'A healthy broker connection is required for this mode.',
    });
  }

  if (config.approvals.requireHealthyMarketData) {
    pushCheck(checks, {
      id: 'market_data',
      label: 'Market data feed',
      passed: context.isMarketDataHealthy,
      severity: config.executionTarget === 'live' ? 'critical' : 'warning',
      reason: context.isMarketDataHealthy
        ? 'Market data feed is healthy.'
        : 'Market data feed is currently not healthy enough for activation.',
    });
  }

  if (config.executionTarget === 'live') {
    pushCheck(checks, {
      id: 'simulation_proven',
      label: 'Simulation history',
      passed: context.hasSimulationHistory,
      severity: 'critical',
      reason: context.hasSimulationHistory
        ? 'Simulation history exists and supports progression toward live mode.'
        : 'Simulation history is required before live activation.',
    });

    pushCheck(checks, {
      id: 'trading_active',
      label: 'Trading enabled',
      passed: !context.isReadOnlyMode,
      severity: 'critical',
      reason: !context.isReadOnlyMode
        ? 'Trading is enabled and not locked to read-only mode.'
        : 'Read-only mode must be disabled before live trading can be activated.',
    });
  }

  const blockingCheckCount = checks.filter((check) => !check.passed).length;
  const ready = blockingCheckCount === 0;

  return {
    modeId: config.id,
    modeLabel: config.label,
    executionTarget: config.executionTarget,
    ready,
    blockingCheckCount,
    checks,
  };
}