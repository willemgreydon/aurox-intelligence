import type { SimulationWorkspace, SimulationOrder, SimulationExecutionInput } from '@repo/api-contracts';
import type { TradeIntentPayload, BrokerModeConfig } from '../types/broker-types';
import type { AgentResult, AgentContext } from '../types/agent-types';
import type { IntelligenceDecisionBundle } from '../types/execution-types';
import type { DecisionPacket, AuditEntry } from '../types/audit-types';
import { agentOk, agentError } from '../types/agent-types';
import { runBrokerSupervisor } from '../broker/broker-supervisor-agent';

// DB operations are injected so this module has no direct @repo/db dependency.
// Callers (apps/worker, apps/web server actions) bind the real repository functions.
export interface SimulationWorkflowDeps {
  loadWorkspace: (userId: string) => Promise<SimulationWorkspace | null>;
  loadMarketPrice: (symbol: string) => Promise<number | null>;
  resolveAssetId: (symbol: string) => Promise<string | null>;
  submitOrder: (input: SimulationExecutionInput) => Promise<SimulationOrder>;
}

export interface SimulationTradeResult {
  readonly packet: DecisionPacket;
  readonly order: SimulationOrder;
  readonly auditEntries: readonly AuditEntry[];
}

function resolveQuantity(
  intent: TradeIntentPayload,
  executionPrice: number,
  allowedOrderNotional: number,
): number {
  if (intent.sizingMode === 'quantity' && intent.quantity !== undefined) {
    return intent.quantity;
  }
  const notional =
    intent.sizingMode === 'notional' && intent.notional !== undefined
      ? Math.min(intent.notional, allowedOrderNotional)
      : allowedOrderNotional;
  return Math.round((notional / executionPrice) * 1_000_000) / 1_000_000;
}

export async function runSimulationTradeWorkflow(
  intent: TradeIntentPayload,
  config: BrokerModeConfig,
  bundle: IntelligenceDecisionBundle,
  context: AgentContext,
  deps: SimulationWorkflowDeps,
): Promise<AgentResult<SimulationTradeResult>> {
  const workspace = await deps.loadWorkspace(context.userId);
  if (workspace === null) {
    return agentError('No simulation workspace found for this account.', 'WORKFLOW_NO_WORKSPACE');
  }

  const executionPrice = await deps.loadMarketPrice(intent.symbol);
  if (executionPrice === null || executionPrice <= 0) {
    return agentError(`No market price available for ${intent.symbol}.`, 'WORKFLOW_NO_PRICE');
  }

  const assetId = await deps.resolveAssetId(intent.symbol);
  if (assetId === null) {
    return agentError(`Asset ${intent.symbol} not found in catalog.`, 'WORKFLOW_ASSET_NOT_FOUND');
  }

  // Enrich intent with intelligence confidence if not already set by the caller
  const confidence = intent.confidence ?? bundle.signal.confidence;
  const enrichedIntent: TradeIntentPayload = { ...intent, confidence };

  const supervisorResult = runBrokerSupervisor(enrichedIntent, config, workspace, context);
  if (!supervisorResult.ok) {
    return agentError(supervisorResult.error, supervisorResult.code);
  }

  const { packet, allowedOrderNotional, auditEntries } = supervisorResult.value;

  if (packet.orderState === 'awaiting_user_approval') {
    return agentError(
      'Order requires human approval before execution.',
      'WORKFLOW_AWAITING_APPROVAL',
    );
  }

  const quantity = resolveQuantity(enrichedIntent, executionPrice, allowedOrderNotional);
  if (quantity <= 0) {
    return agentError(
      'Computed order quantity is zero or negative. Check intent sizing or capital budget.',
      'WORKFLOW_ZERO_QUANTITY',
    );
  }

  const notes = `[${intent.source}] ${intent.thesis.slice(0, 200)}`;

  const executionInput: SimulationExecutionInput = {
    userId: context.userId,
    assetId,
    symbol: intent.symbol,
    assetClass: intent.assetKind,
    side: intent.side,
    quantity,
    executionPrice,
    requestedPrice: executionPrice,
    notes,
  };

  const order = await deps.submitOrder(executionInput);

  return agentOk<SimulationTradeResult>({ packet, order, auditEntries });
}
