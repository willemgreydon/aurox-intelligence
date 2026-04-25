export type ExecutionMode =
  | 'simulation'
  | 'paper'
  | 'live-manual'
  | 'live-ai-assisted'
  | 'live-autonomous';

export interface ExecutionModeDefinition {
  readonly id: ExecutionMode;
  readonly label: string;
  readonly executionTarget: 'simulation' | 'live';
  readonly aiAssisted: boolean;
  readonly autonomous: boolean;
  readonly enabledByDefault: boolean;
}

export interface ExecutionModeGateContext {
  readonly isAuthenticated: boolean;
  readonly isKycVerified: boolean;
  readonly isBrokerConnected: boolean;
  readonly brokerSupportsAssetClass: boolean;
  readonly riskProfileConfigured: boolean;
  readonly maxPositionConfigured: boolean;
  readonly emergencyStopEnabled: boolean;
  readonly auditLoggingEnabled: boolean;
  readonly explicitLiveConfirmation: boolean;
  readonly autonomousOptIn: boolean;
}

export interface ExecutionModeGateCheck {
  readonly id: string;
  readonly label: string;
  readonly passed: boolean;
  readonly reason: string;
}

export interface ExecutionModeGateResult {
  readonly mode: ExecutionMode;
  readonly allowed: boolean;
  readonly checks: readonly ExecutionModeGateCheck[];
}
