import type { TradeIntentPayload, BrokerModeConfig, AccountCapitalState } from '../types/broker-types';
import type { PolicyDecision, PolicyCheckResult, PolicyVerdict } from '../types/policy-types';
import { checkModePolicy } from '../policies/mode-policy';
import { checkMoneyLimitPolicy } from '../policies/money-limit-policy';

function resolveOverallVerdict(checks: readonly PolicyCheckResult[]): PolicyVerdict {
  if (checks.some((c) => c.verdict === 'rejected')) return 'rejected';
  if (checks.some((c) => c.verdict === 'requires_approval')) return 'requires_approval';
  return 'approved';
}

export function runPolicyChecks(
  intent: TradeIntentPayload,
  config: BrokerModeConfig,
  account: AccountCapitalState,
  traceId: string,
): PolicyDecision {
  const checks: PolicyCheckResult[] = [
    ...checkModePolicy(intent, config, account),
    ...checkMoneyLimitPolicy(intent, config, account),
  ];

  return {
    traceId,
    accountId: intent.accountId,
    modeId: intent.modeId,
    overallVerdict: resolveOverallVerdict(checks),
    checks,
    decidedAt: new Date().toISOString(),
  };
}
