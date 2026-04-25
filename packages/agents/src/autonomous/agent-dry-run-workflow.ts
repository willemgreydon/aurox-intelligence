import type { AgentAuditLogModel, AgentDecisionContract } from './agent-capability-types';

export interface AgentDryRunInput {
  readonly agentId: string;
  readonly decision: AgentDecisionContract;
}

export interface AgentDryRunResult {
  readonly accepted: boolean;
  readonly audit: AgentAuditLogModel;
}

export function runAgentDryRun(input: AgentDryRunInput): AgentDryRunResult {
  const blockingCheck = input.decision.riskChecks.find((check) => !check.passed);
  const accepted =
    input.decision.executionMode !== 'live' &&
    !blockingCheck &&
    (input.decision.intent === 'hold' || input.decision.requiresApproval || input.decision.confidence >= 0.55);

  const audit: AgentAuditLogModel = {
    id: `agent-audit-${Date.now()}`,
    agentId: input.agentId,
    createdAt: new Date().toISOString(),
    decision: input.decision,
    accepted,
    notes: accepted
      ? ['Dry-run accepted in simulation-safe mode.']
      : [
          blockingCheck
            ? `Rejected due to risk check: ${blockingCheck.reason}`
            : 'Rejected by dry-run policy: live execution is disabled for autonomous workflows.',
        ],
  };

  return { accepted, audit };
}
