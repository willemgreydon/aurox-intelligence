import type {
  ExecutionMode,
  ExecutionModeGateCheck,
  ExecutionModeGateContext,
  ExecutionModeGateResult,
} from './execution-mode-types';

function makeCheck(
  id: string,
  label: string,
  passed: boolean,
  passReason: string,
  failReason: string,
): ExecutionModeGateCheck {
  return {
    id,
    label,
    passed,
    reason: passed ? passReason : failReason,
  };
}

export function evaluateExecutionModeGate(
  mode: ExecutionMode,
  context: ExecutionModeGateContext,
): ExecutionModeGateResult {
  const checks: ExecutionModeGateCheck[] = [];

  checks.push(
    makeCheck(
      'auth',
      'User authenticated',
      context.isAuthenticated,
      'User session is active.',
      'Authentication is required before mode selection.',
    ),
  );

  if (mode.startsWith('live')) {
    checks.push(
      makeCheck('kyc', 'KYC verified', context.isKycVerified, 'KYC verification complete.', 'KYC verification is required.'),
      makeCheck('broker', 'Broker connected', context.isBrokerConnected, 'Broker connection is healthy.', 'Broker connection is missing.'),
      makeCheck(
        'asset-support',
        'Broker supports requested asset class',
        context.brokerSupportsAssetClass,
        'Broker supports the requested asset class.',
        'Broker does not support the requested asset class.',
      ),
      makeCheck(
        'risk-profile',
        'Risk profile configured',
        context.riskProfileConfigured,
        'Risk profile is configured.',
        'Risk profile configuration is required.',
      ),
      makeCheck(
        'max-position',
        'Max position configured',
        context.maxPositionConfigured,
        'Max position limit is configured.',
        'Max position limit must be configured before live modes.',
      ),
      makeCheck(
        'kill-switch',
        'Emergency stop enabled',
        context.emergencyStopEnabled,
        'Emergency stop is active.',
        'Emergency stop must be enabled.',
      ),
      makeCheck(
        'audit-log',
        'Audit logging enabled',
        context.auditLoggingEnabled,
        'Audit logging is enabled.',
        'Audit logging must be enabled.',
      ),
      makeCheck(
        'live-confirmation',
        'Explicit live confirmation',
        context.explicitLiveConfirmation,
        'Explicit live-mode confirmation recorded.',
        'Explicit live-mode confirmation is required.',
      ),
    );
  }

  if (mode === 'live-autonomous') {
    checks.push(
      makeCheck(
        'autonomous-default-off',
        'Autonomous mode explicitly enabled',
        context.autonomousOptIn,
        'Autonomous mode opt-in was explicitly granted.',
        'Autonomous mode is disabled by default until explicit opt-in.',
      ),
    );
  }

  const allowed = checks.every((check) => check.passed);
  return { mode, allowed, checks };
}
