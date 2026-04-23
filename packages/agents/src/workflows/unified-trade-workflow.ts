import type { SimulationWorkspace } from '@repo/api-contracts';
import type { TradeIntentPayload, BrokerModeConfig } from '../types/broker-types';
import type { AgentResult, AgentContext } from '../types/agent-types';
import type { IntelligenceDecisionBundle } from '../types/execution-types';
import type { DecisionPacket, AuditEntry } from '../types/audit-types';
import type {
  BrokerExecutionAdapter,
  ExecutionOrderResult,
  ExecutionOrderRequest,
} from '../adapters/broker-execution-adapter';
import { agentOk, agentError } from '../types/agent-types';
import { runBrokerSupervisor } from '../broker/broker-supervisor-agent';

export interface UnifiedTradeWorkspaceDeps {
  loadWorkspace: (userId: string) => Promise<SimulationWorkspace | null>;
  loadMarketPrice: (symbol: string) => Promise<number | null>;
  resolveAssetId: (symbol: string) => Promise<string | null>;
}

export interface UnifiedTradeResult {
  readonly packet: DecisionPacket;
  readonly order: ExecutionOrderResult;
  readonly auditEntries: readonly AuditEntry[];
}

function roundQuantity(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function sanitizePositiveNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function resolveQuantity(
  intent: TradeIntentPayload,
  executionPrice: number,
  allowedOrderNotional: number,
): number {
  if (intent.sizingMode === 'quantity') {
    const quantity = sanitizePositiveNumber(intent.quantity);
    return quantity === null ? 0 : roundQuantity(quantity);
  }

  if (intent.sizingMode === 'notional') {
    const requestedNotional = sanitizePositiveNumber(intent.notional);
    const boundedNotional =
      requestedNotional === null
        ? allowedOrderNotional
        : Math.min(requestedNotional, allowedOrderNotional);

    return roundQuantity(boundedNotional / executionPrice);
  }

  const requestedRiskBudget = sanitizePositiveNumber(intent.notional);
  const boundedRiskBudget =
    requestedRiskBudget === null
      ? allowedOrderNotional
      : Math.min(requestedRiskBudget, allowedOrderNotional);

  return roundQuantity(boundedRiskBudget / executionPrice);
}

function buildOrderNotes(
  intent: TradeIntentPayload,
  bundle: IntelligenceDecisionBundle,
): string {
  const thesis = intent.thesis.trim().slice(0, 220);
  const confidence = intent.confidence ?? bundle.signal.confidence;
  const signalDirection = bundle.signal.direction;
  const strategyTag = intent.strategyTag?.trim();

  return [
    `[source:${intent.source}]`,
    `[signal:${signalDirection}]`,
    `[confidence:${confidence.toFixed(2)}]`,
    strategyTag ? `[strategy:${strategyTag}]` : null,
    thesis,
  ]
    .filter(Boolean)
    .join(' ');
}

function buildExecutionRequest(input: {
  context: AgentContext;
  intent: TradeIntentPayload;
  assetId: string;
  executionPrice: number;
  quantity: number;
  bundle: IntelligenceDecisionBundle;
}): ExecutionOrderRequest {
  const { context, intent, assetId, executionPrice, quantity, bundle } = input;

  return {
    userId: context.userId,
    symbol: intent.symbol,
    assetId,
    assetKind: intent.assetKind,
    side: intent.side,
    quantity,
    executionPrice,
    requestedPrice: executionPrice,
    notes: buildOrderNotes(intent, bundle),
    metadata: {
      traceId: context.traceId,
      modeId: context.modeId,
      accountId: context.accountId,
      source: intent.source,
      confidence: intent.confidence ?? bundle.signal.confidence,
      signalDirection: bundle.signal.direction,
      generatedAt: bundle.generatedAt,
      strategyTag: intent.strategyTag ?? null,
    },
  };
}

export async function runUnifiedTradeWorkflow(
  intent: TradeIntentPayload,
  config: BrokerModeConfig,
  bundle: IntelligenceDecisionBundle,
  context: AgentContext,
  adapter: BrokerExecutionAdapter,
  deps: UnifiedTradeWorkspaceDeps,
): Promise<AgentResult<UnifiedTradeResult>> {
  if (adapter.executionTarget !== config.executionTarget) {
    return agentError(
      `Adapter target "${adapter.executionTarget}" does not match config target "${config.executionTarget}".`,
      'WORKFLOW_TARGET_MISMATCH',
    );
  }

  const workspace = await deps.loadWorkspace(context.userId);
  if (workspace === null) {
    return agentError('No workspace found for this account.', 'WORKFLOW_NO_WORKSPACE');
  }

  const rawExecutionPrice = await deps.loadMarketPrice(intent.symbol);
  const executionPrice = sanitizePositiveNumber(rawExecutionPrice);
  if (executionPrice === null) {
    return agentError(`No valid market price available for ${intent.symbol}.`, 'WORKFLOW_NO_PRICE');
  }

  const assetId = await deps.resolveAssetId(intent.symbol);
  if (assetId === null) {
    return agentError(`Asset ${intent.symbol} not found in catalog.`, 'WORKFLOW_ASSET_NOT_FOUND');
  }

  const enrichedIntent: TradeIntentPayload = {
    ...intent,
    confidence: intent.confidence ?? bundle.signal.confidence,
  };

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
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return agentError(
      'Computed order quantity is zero or invalid. Check intent sizing or capital budget.',
      'WORKFLOW_ZERO_QUANTITY',
    );
  }

  const orderRequest = buildExecutionRequest({
    context,
    intent: enrichedIntent,
    assetId,
    executionPrice,
    quantity,
    bundle,
  });

  const orderResult = await adapter.submitOrder(orderRequest, context);
  if (!orderResult.ok) {
    return agentError(orderResult.error, orderResult.code);
  }

  return agentOk<UnifiedTradeResult>({
    packet,
    order: orderResult.value,
    auditEntries,
  });
}