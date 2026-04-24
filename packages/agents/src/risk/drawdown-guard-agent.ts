import type { AgentResult } from '../types/agent-types';
import { agentError, agentOk } from '../types/agent-types';
import type { AccountCapitalState, BrokerModeConfig } from '../types/broker-types';

export interface DrawdownGuardResult {
  readonly currentDrawdownPercent: number;
  readonly maxDrawdownPercent: number;
  readonly remainingDrawdownBudgetPercent: number;
}

export function runDrawdownGuard(
  state: AccountCapitalState,
  config: BrokerModeConfig,
): AgentResult<DrawdownGuardResult> {
  const current = state.currentDrawdownPercent;
  const max = config.risk.maxDrawdownPercent;
  const remaining = Math.max(0, max - current);

  if (current >= max) {
    return agentError(
      `Drawdown guard blocked execution (${(current * 100).toFixed(2)}% >= ${(max * 100).toFixed(2)}%).`,
      'DRAWDOWN_GUARD_LIMIT_REACHED',
    );
  }

  return agentOk({
    currentDrawdownPercent: current,
    maxDrawdownPercent: max,
    remainingDrawdownBudgetPercent: remaining,
  });
}

