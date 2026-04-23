import type { SimulationExecutionInput, SimulationOrder } from '@repo/api-contracts';
import type { AgentContext, AgentResult } from '../types/agent-types';
import { agentOk, agentError } from '../types/agent-types';
import type {
  BrokerExecutionAdapter,
  ExecutionOrderRequest,
  ExecutionOrderResult,
} from './broker-execution-adapter';

export interface SimulationAdapterDeps {
  submitOrder: (input: SimulationExecutionInput) => Promise<SimulationOrder>;
}

export function createSimulationBrokerAdapter(deps: SimulationAdapterDeps): BrokerExecutionAdapter {
  return {
    executionTarget: 'simulation',
    async submitOrder(
      request: ExecutionOrderRequest,
      _context: AgentContext,
    ): Promise<AgentResult<ExecutionOrderResult>> {
      const input: SimulationExecutionInput = {
        userId: request.userId,
        assetId: request.assetId,
        symbol: request.symbol,
        assetClass: request.assetKind,
        side: request.side,
        quantity: request.quantity,
        executionPrice: request.executionPrice,
        requestedPrice: request.requestedPrice,
        notes: request.notes,
      };

      try {
        const order = await deps.submitOrder(input);

        const result: ExecutionOrderResult = {
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          quantity: order.quantity,
          executionPrice: order.executedPrice,
          requestedPrice: order.requestedPrice,
          executionTarget: 'simulation',
          filledAt: new Date(order.executedAt),
          status: 'filled',
        };

        return agentOk(result);
      } catch (err) {
        return agentError(
          err instanceof Error ? err.message : 'Simulation order submission failed.',
          'ADAPTER_SUBMIT_FAILED',
        );
      }
    },
  };
}