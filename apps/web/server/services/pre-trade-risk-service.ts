import {
  buildAccountCapitalState,
  runPolicyChecks,
  type PolicyCheckResult,
  type TradeIntentPayload,
} from '@repo/agents';
import { getSimulationWorkspaceIfExists } from '@repo/db';
import { getBrokerModeConfig } from '../config/broker-mode-registry';
import { getOptionalCurrentSession } from '../auth/session';
import type {
  PreTradeRiskGateViewModel,
  RiskGateCheckViewModel,
} from '../../lib/pre-trade-risk-view';

type PreTradeRiskInput = {
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  side: 'buy' | 'sell';
  laneId: string;
};

// Friendly labels for the deterministic policy check ids.
const CHECK_LABELS: Record<string, string> = {
  'mode.enabled': 'Lane enabled',
  'mode.assetKind': 'Asset class permitted',
  'mode.humanApproval': 'Approval policy',
  'mode.perTradeLimit': 'Per-trade limit',
  'mode.confidence': 'Signal confidence',
  'mode.dailyOrders': 'Daily order limit',
  'mode.dailyLoss': 'Daily loss circuit breaker',
  'mode.drawdown': 'Drawdown circuit breaker',
  'money.cashAvailable': 'Cash available',
  'money.capitalEnvelope': 'Capital envelope',
  'money.orderBudget': 'Order budget',
  'money.positionCap': 'Open position cap',
  'position.maxOpen': 'Max open positions',
  'position.concentration': 'Position concentration',
};

function mapCheck(check: PolicyCheckResult): RiskGateCheckViewModel {
  const status =
    check.verdict === 'rejected'
      ? 'FAILED'
      : check.verdict === 'requires_approval'
        ? 'NEEDS_APPROVAL'
        : 'PASSED';
  const tone = status === 'FAILED' ? 'danger' : status === 'NEEDS_APPROVAL' ? 'warning' : 'success';
  return {
    id: check.checkId,
    label: CHECK_LABELS[check.checkId] ?? check.checkId,
    status,
    tone,
    reason: check.reason,
  };
}

/**
 * Server-side pre-trade risk read model (AUR-018 / risk-gates-required.md).
 *
 * Evaluates the quantity-INDEPENDENT account-level gates for a prospective order
 * (lane enabled, asset permitted, cash available, capital envelope, open-position
 * cap, daily-loss/drawdown circuit breakers). Quantity/notional-dependent checks
 * (per-trade limit, concentration) are intentionally omitted here — they are
 * enforced on submit by the order action — so this summary never shows a
 * misleading pass/fail against a quantity the user has not entered yet.
 *
 * Returns null (no panel) when there is no session/workspace/lane config.
 */
export async function getPreTradeRiskGate(input: PreTradeRiskInput): Promise<PreTradeRiskGateViewModel | null> {
  const auth = await getOptionalCurrentSession();
  if (!auth) return null;

  const config = getBrokerModeConfig(input.laneId);
  if (!config) return null;

  const workspace = await getSimulationWorkspaceIfExists(auth.user.id);
  if (!workspace) return null;

  const capitalState = buildAccountCapitalState(workspace.summary, workspace.orders);

  // No quantity/notional → only the quantity-independent gates are evaluated.
  const intent: TradeIntentPayload = {
    accountId: auth.user.id,
    modeId: config.id,
    source: 'manual',
    symbol: input.symbol,
    assetKind: input.assetClass,
    side: input.side,
    sizingMode: 'quantity',
    thesis: 'Pre-trade readiness check.',
  };

  const decision = runPolicyChecks(intent, config, capitalState, 'pretrade-readiness');
  const checks = decision.checks.map(mapCheck);
  const failedCount = checks.filter((check) => check.status === 'FAILED').length;

  return {
    checks,
    canSubmit: failedCount === 0,
    failedCount,
  };
}
