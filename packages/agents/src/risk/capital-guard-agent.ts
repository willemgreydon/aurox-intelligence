import type { SimulationAccountSummary, SimulationOrder } from '@repo/api-contracts';
import type { BrokerModeConfig, AccountCapitalState, OrderSide } from '../types/broker-types';
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
  side: OrderSide = 'buy',
): AgentResult<CapitalGuardResult> {
  // Sells produce cash — they do not consume capital and do not require a cash balance to proceed.
  // All capital envelope checks are buy-only concerns.
  if (side === 'sell') {
    const state = buildAccountCapitalState(summary, orders);
    // For sells, allowedOrderNotional is not a buy-budget concept.
    // Return a sentinel value (Infinity) so the workflow's resolveQuantity
    // falls back to the intent's own quantity/notional rather than being capped.
    return agentOk<CapitalGuardResult>({
      state,
      allowedCapital: Infinity,
      allowedOrderNotional: Infinity,
    });
  }

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

  // Remaining daily budget is exhausted when prior orders have consumed the full envelope.
  if (allowedOrderNotional <= 0) {
    return agentError<CapitalGuardResult>(
      'Capital envelope exhausted for this mode.',
      'CAPITAL_GUARD_ENVELOPE_EXHAUSTED',
    );
  }

  return agentOk<CapitalGuardResult>({ state, allowedCapital, allowedOrderNotional });
}
