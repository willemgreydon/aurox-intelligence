import { describe, expect, it } from 'vitest';
import { reconcileExecution } from '../execution/reconciliation-agent';
import type { ExecutionOrderRequest, ExecutionOrderResult } from '../adapters/broker-execution-adapter';

function makeRequest(overrides: Partial<ExecutionOrderRequest> = {}): ExecutionOrderRequest {
  return {
    userId: 'user-1',
    symbol: 'AAPL',
    assetId: 'asset-1',
    assetKind: 'stock',
    side: 'buy',
    quantity: 2,
    executionPrice: 150,
    requestedPrice: 150,
    notes: 'test',
    ...overrides,
  };
}

function makeResult(overrides: Partial<ExecutionOrderResult> = {}): ExecutionOrderResult {
  return {
    orderId: 'order-1',
    symbol: 'AAPL',
    side: 'buy',
    quantity: 2,
    executionPrice: 150,
    requestedPrice: 150,
    executionTarget: 'simulation',
    filledAt: new Date(),
    status: 'filled',
    ...overrides,
  };
}

describe('reconcileExecution', () => {
  it('approves matching execution payloads', () => {
    const result = reconcileExecution(makeRequest(), makeResult());
    expect(result.ok).toBe(true);
  });

  it('fails on symbol mismatch', () => {
    const result = reconcileExecution(makeRequest(), makeResult({ symbol: 'MSFT' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('EXECUTION_RECONCILIATION_FAILED');
      expect(result.error).toContain('symbol mismatch');
    }
  });
});

