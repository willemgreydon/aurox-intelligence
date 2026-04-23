import type { AgentResult, AgentContext } from '../types/agent-types';
import type { AssetKind, ExecutionTarget } from '../types/broker-types';

export interface ExecutionOrderRequest {
  readonly userId: string;
  readonly symbol: string;
  readonly assetId: string;
  readonly assetKind: AssetKind;
  readonly side: 'buy' | 'sell';
  readonly quantity: number;
  readonly executionPrice: number;
  readonly requestedPrice: number;
  readonly notes: string;
  readonly metadata?: {
    readonly traceId?: string;
    readonly modeId?: string;
    readonly accountId?: string;
    readonly source?: string;
    readonly confidence?: number;
    readonly signalDirection?: string;
    readonly generatedAt?: string;
    readonly strategyTag?: string | null;
  };
}

export interface ExecutionOrderResult {
  readonly orderId: string;
  readonly symbol: string;
  readonly side: 'buy' | 'sell';
  readonly quantity: number;
  readonly executionPrice: number;
  readonly requestedPrice: number;
  readonly executionTarget: ExecutionTarget;
  readonly filledAt: Date;
  readonly status?: 'submitted' | 'filled' | 'partially_filled' | 'rejected';
}

export interface BrokerExecutionAdapter {
  readonly executionTarget: ExecutionTarget;
  submitOrder(
    request: ExecutionOrderRequest,
    context: AgentContext,
  ): Promise<AgentResult<ExecutionOrderResult>>;
}