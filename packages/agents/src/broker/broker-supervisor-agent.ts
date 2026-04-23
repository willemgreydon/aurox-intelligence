import type { SimulationWorkspace } from '@repo/api-contracts';
import type { TradeIntentPayload, BrokerModeConfig } from '../types/broker-types';
import type { AgentResult, AgentContext } from '../types/agent-types';
import type { DecisionPacket, AuditEntry } from '../types/audit-types';
import { agentOk, agentError } from '../types/agent-types';
import { runPolicyChecks } from '../core/policy-engine';
import { runCapitalGuard } from '../risk/capital-guard-agent';
import { runPositionLimitAgent } from '../risk/position-limit-agent';
import { createAuditTrail } from '../core/agent-orchestrator';

export interface SupervisorResult {
  readonly packet: DecisionPacket;
  readonly allowedOrderNotional: number;
  readonly auditEntries: readonly AuditEntry[];
}

export function runBrokerSupervisor(
  intent: TradeIntentPayload,
  config: BrokerModeConfig,
  workspace: SimulationWorkspace,
  context: AgentContext,
): AgentResult<SupervisorResult> {
  const audit = createAuditTrail(context.traceId, context.userId, context.accountId);

  audit.add('supervisor.started', {
    symbol: intent.symbol,
    source: intent.source,
    modeId: intent.modeId,
    sizingMode: intent.sizingMode,
  });

  const capitalResult = runCapitalGuard(workspace.summary, workspace.orders, config);
  if (!capitalResult.ok) {
    audit.add('supervisor.blocked', {
      stage: 'capital_guard',
      reason: capitalResult.error,
    });

    return agentError<SupervisorResult>(capitalResult.error, capitalResult.code);
  }

  audit.add('supervisor.capital_guard_passed', {
    allowedCapital: capitalResult.value.allowedCapital,
    allowedOrderNotional: capitalResult.value.allowedOrderNotional,
    usedCapitalToday: capitalResult.value.state.usedCapitalToday,
    cashBalance: capitalResult.value.state.cashBalance,
  });

  const policyDecision = runPolicyChecks(
    intent,
    config,
    capitalResult.value.state,
    context.traceId,
  );

  audit.add('supervisor.policy_evaluated', {
    verdict: policyDecision.overallVerdict,
    totalChecks: policyDecision.checks.length,
  });

  if (policyDecision.overallVerdict === 'rejected') {
    const firstRejected = policyDecision.checks.find((check) => check.verdict === 'rejected');
    const reason = firstRejected?.reason ?? 'Policy check rejected the intent.';

    audit.add('supervisor.blocked', {
      stage: 'policy',
      reason,
    });

    return agentError<SupervisorResult>(reason, 'SUPERVISOR_POLICY_REJECTED');
  }

  const positionResult = runPositionLimitAgent(
    workspace.positions,
    config,
    intent,
    workspace.summary.portfolioValue,
  );

  if (!positionResult.ok) {
    audit.add('supervisor.blocked', {
      stage: 'position_limits',
      reason: positionResult.error,
    });

    return agentError<SupervisorResult>(positionResult.error, positionResult.code);
  }

  const firstRejectedPosition = positionResult.value.find(
    (check) => check.verdict === 'rejected',
  );

  if (firstRejectedPosition !== undefined) {
    audit.add('supervisor.blocked', {
      stage: 'position_limits',
      reason: firstRejectedPosition.reason,
    });

    return agentError<SupervisorResult>(
      firstRejectedPosition.reason,
      'SUPERVISOR_POSITION_REJECTED',
    );
  }

  const openPositions = workspace.positions.filter((position) => position.closedAt === null).length;

  audit.add('supervisor.position_limits_passed', {
    openPositions,
  });

  const orderState =
    policyDecision.overallVerdict === 'requires_approval'
      ? ('awaiting_user_approval' as const)
      : ('approved' as const);

  const packet: DecisionPacket = {
    traceId: context.traceId,
    userId: context.userId,
    accountId: context.accountId,
    modeId: intent.modeId,
    symbol: intent.symbol,
    assetKind: intent.assetKind,
    requestedAction: intent.side,
    intentSource: intent.source,
    policyDecision,
    executionTarget: config.executionTarget,
    orderState,
    generatedAt: new Date().toISOString(),
  };

  audit.add('supervisor.decision_issued', {
    orderState,
    executionTarget: config.executionTarget,
    allowedOrderNotional: capitalResult.value.allowedOrderNotional,
  });

  return agentOk<SupervisorResult>({
    packet,
    allowedOrderNotional: capitalResult.value.allowedOrderNotional,
    auditEntries: audit.entries(),
  });
}