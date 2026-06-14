// Pure, dependency-free view-model types for the pre-trade risk gate.
// Shared by the server read-model service and the client UI so neither side
// re-derives risk logic (read-model-rule.md): the server computes pass/fail,
// the client only renders it.

export type RiskGateCheckStatus = 'PASSED' | 'FAILED' | 'NEEDS_APPROVAL';
export type RiskGateTone = 'success' | 'danger' | 'warning';

export type RiskGateCheckViewModel = {
  id: string;
  label: string;
  status: RiskGateCheckStatus;
  tone: RiskGateTone;
  reason: string;
};

export type PreTradeRiskGateViewModel = {
  checks: RiskGateCheckViewModel[];
  /** False when any blocking (FAILED) gate is present — used to disable Submit. */
  canSubmit: boolean;
  failedCount: number;
};
