import type { SimulationAccountSummary, SimulationOrder } from '@repo/api-contracts';
import type { BrokerModeConfig, AccountCapitalState } from '../types/broker-types';
import type { AgentResult } from '../types/agent-types';
import { agentOk, agentError } from '../types/agent-types';
import { computeAllowedCapital, computeAllowedOrderNotional } from '../policies/money-limit-policy';

export interface CapitalGuardResult {
  readonly state: AccountCapitalState;
  readonly allowedCapital: number;
  readonly allowedOrderNotional: number;
}

export function buildAccountCapitalState(
  summary: SimulationAccountSummary,
  orders: SimulationOrder[],
): AccountCapitalState {
  const today = new Date().toISOString().slice(0, 10);
  const todayFilled = orders.filter(
    (o) => o.status === 'filled' && o.createdAt.slice(0, 10) === today,
  );

  const usedCapitalToday = todayFilled
    .filter((o) => o.side === 'buy')
    .reduce((sum, o) => sum + o.grossAmount, 0);

  const dailyPnl = todayFilled.reduce((sum, o) => sum + o.realizedPnl, 0);
  const dailyLossPercent =
    dailyPnl < 0 && summary.initialCashBalance > 0
      ? Math.abs(dailyPnl) / summary.initialCashBalance
      : 0;

  const currentDrawdownPercent =
    summary.initialCashBalance > 0
      ? Math.max(0, (summary.initialCashBalance - summary.equityValue) / summary.initialCashBalance)
      : 0;

  return {
    cashBalance: summary.cashBalance,
    usedCapitalToday,
    openPositionCount: summary.positionCount,
    currentDrawdownPercent,
    dailyLossPercent,
    ordersExecutedToday: todayFilled.length,
    lastOrderAt: todayFilled.at(-1)?.executedAt ?? null,
  };
}

export function runCapitalGuard(
  summary: SimulationAccountSummary,
  orders: SimulationOrder[],
  config: BrokerModeConfig,
): AgentResult<CapitalGuardResult> {
  if (summary.cashBalance <= 0) {
    return agentError<CapitalGuardResult>('Account has no available cash.', 'CAPITAL_GUARD_NO_CASH');
  }

  const state = buildAccountCapitalState(summary, orders);
  const allowedCapital = computeAllowedCapital(config, state);

  if (allowedCapital <= 0) {
    return agentError<CapitalGuardResult>(
      'Capital envelope exhausted for this mode.',
      'CAPITAL_GUARD_ENVELOPE_EXHAUSTED',
    );
  }

  const allowedOrderNotional = computeAllowedOrderNotional(config, state, allowedCapital);

  return agentOk<CapitalGuardResult>({ state, allowedCapital, allowedOrderNotional });
}
