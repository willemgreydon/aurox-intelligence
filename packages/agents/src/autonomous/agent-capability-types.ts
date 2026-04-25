export type AutonomousAgentCapability =
  | 'signal-analysis'
  | 'risk-check'
  | 'portfolio-rebalance'
  | 'order-proposal'
  | 'dry-run-execution';

export interface AgentDecisionRiskCheck {
  readonly id: string;
  readonly passed: boolean;
  readonly reason: string;
}

export interface AgentDecisionContract {
  readonly intent: 'open' | 'close' | 'rebalance' | 'hold';
  readonly symbol: string;
  readonly reasoning: readonly string[];
  readonly confidence: number;
  readonly riskChecks: readonly AgentDecisionRiskCheck[];
  readonly executionMode: 'simulation' | 'paper' | 'live';
  readonly requiresApproval: boolean;
}

export interface AgentAuditLogModel {
  readonly id: string;
  readonly agentId: string;
  readonly createdAt: string;
  readonly decision: AgentDecisionContract;
  readonly accepted: boolean;
  readonly notes: readonly string[];
}
