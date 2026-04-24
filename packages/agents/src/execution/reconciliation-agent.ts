import type { AgentResult } from '../types/agent-types';
import { agentError, agentOk } from '../types/agent-types';
import type { ExecutionOrderRequest, ExecutionOrderResult } from '../adapters/broker-execution-adapter';

export interface ReconciliationResult {
  readonly reconciled: boolean;
  readonly anomalies: readonly string[];
}

function almostEqual(left: number, right: number, tolerance = 1e-8): boolean {
  return Math.abs(left - right) <= tolerance;
}

export function reconcileExecution(
  request: ExecutionOrderRequest,
  result: ExecutionOrderResult,
): AgentResult<ReconciliationResult> {
  const anomalies: string[] = [];

  if (request.symbol !== result.symbol) {
    anomalies.push(`symbol mismatch: requested=${request.symbol} filled=${result.symbol}`);
  }

  if (request.side !== result.side) {
    anomalies.push(`side mismatch: requested=${request.side} filled=${result.side}`);
  }

  if (!almostEqual(request.quantity, result.quantity)) {
    anomalies.push(`quantity mismatch: requested=${request.quantity} filled=${result.quantity}`);
  }

  if (!almostEqual(request.requestedPrice, result.requestedPrice)) {
    anomalies.push(
      `requested price mismatch: requested=${request.requestedPrice} echoed=${result.requestedPrice}`,
    );
  }

  if (anomalies.length > 0) {
    return agentError(
      `Execution reconciliation failed: ${anomalies.join('; ')}`,
      'EXECUTION_RECONCILIATION_FAILED',
    );
  }

  return agentOk({
    reconciled: true,
    anomalies,
  });
}

