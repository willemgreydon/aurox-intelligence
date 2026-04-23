export type PolicyVerdict = 'approved' | 'rejected' | 'requires_approval';

export interface PolicyCheckResult {
  readonly checkId: string;
  readonly verdict: PolicyVerdict;
  readonly reason: string;
  readonly constraintApplied?: string;
}

export interface PolicyDecision {
  readonly traceId: string;
  readonly accountId: string;
  readonly modeId: string;
  readonly overallVerdict: PolicyVerdict;
  readonly checks: readonly PolicyCheckResult[];
  readonly decidedAt: string;
}
