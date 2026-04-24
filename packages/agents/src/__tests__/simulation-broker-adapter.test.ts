import { describe, expect, it, vi } from 'vitest';
import { createSimulationBrokerAdapter } from '../adapters/simulation-broker-adapter';
import type { ExecutionOrderRequest } from '../adapters/broker-execution-adapter';
import type { AgentContext, TraceId } from '../types/agent-types';
import type { SimulationOrder } from '@repo/api-contracts';

function makeOrder(overrides: Partial<SimulationOrder> = {}): SimulationOrder {
  const now = new Date().toISOString();
  return {
    id: 'order-1',
    assetId: 'asset-aapl',
    symbol: 'AAPL',
    assetClass: 'stock',
    side: 'buy',
    status: 'filled',
    quantity: 5,
    requestedPrice: 180,
    executedPrice: 180.072,
    grossAmount: 900.36,
    cashEffect: -900.36,
    realizedPnl: 0,
    notes: null,
    createdAt: now,
    executedAt: now,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<ExecutionOrderRequest> = {}): ExecutionOrderRequest {
  return {
    userId: 'user-1',
    symbol: 'AAPL',
    assetId: 'asset-aapl',
    assetKind: 'stock',
    side: 'buy',
    quantity: 5,
    executionPrice: 180.072,
    requestedPrice: 180,
    notes: '[manual_ui] Buy AAPL',
    ...overrides,
  };
}

function makeContext(): AgentContext {
  return {
    traceId: crypto.randomUUID() as TraceId,
    accountId: 'user-1',
    userId: 'user-1',
    modeId: 'manual_only',
    initiatedAt: new Date().toISOString(),
  };
}

describe('createSimulationBrokerAdapter', () => {
  it('has executionTarget set to simulation', () => {
    const adapter = createSimulationBrokerAdapter({ submitOrder: vi.fn() });
    expect(adapter.executionTarget).toBe('simulation');
  });

  it('returns ok result with correctly mapped fields on successful submit', async () => {
    const order = makeOrder();
    const submitOrder = vi.fn().mockResolvedValue(order);
    const adapter = createSimulationBrokerAdapter({ submitOrder });

    const result = await adapter.submitOrder(makeRequest(), makeContext());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.orderId).toBe('order-1');
      expect(result.value.symbol).toBe('AAPL');
      expect(result.value.side).toBe('buy');
      expect(result.value.quantity).toBe(5);
      expect(result.value.executionPrice).toBe(180.072);
      expect(result.value.requestedPrice).toBe(180);
      expect(result.value.executionTarget).toBe('simulation');
      expect(result.value.status).toBe('filled');
      expect(result.value.filledAt).toBeInstanceOf(Date);
    }
  });

  it('passes the correct SimulationExecutionInput to submitOrder', async () => {
    const order = makeOrder();
    const submitOrder = vi.fn().mockResolvedValue(order);
    const adapter = createSimulationBrokerAdapter({ submitOrder });
    const request = makeRequest({ side: 'sell', quantity: 3, notes: '[manual] sell note' });

    await adapter.submitOrder(request, makeContext());

    expect(submitOrder).toHaveBeenCalledOnce();
    const callArgs = submitOrder.mock.calls[0];
    expect(callArgs).toBeDefined();
    const input = callArgs![0];
    expect(input.userId).toBe('user-1');
    expect(input.assetId).toBe('asset-aapl');
    expect(input.symbol).toBe('AAPL');
    expect(input.assetClass).toBe('stock');
    expect(input.side).toBe('sell');
    expect(input.quantity).toBe(3);
    expect(input.notes).toBe('[manual] sell note');
  });

  it('returns agentError when submitOrder throws an Error', async () => {
    const submitOrder = vi.fn().mockRejectedValue(new Error('Insufficient fictive cash balance for this order.'));
    const adapter = createSimulationBrokerAdapter({ submitOrder });

    const result = await adapter.submitOrder(makeRequest(), makeContext());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Insufficient fictive cash balance for this order.');
      expect(result.code).toBe('ADAPTER_SUBMIT_FAILED');
    }
  });

  it('returns agentError with fallback message when submitOrder throws a non-Error', async () => {
    const submitOrder = vi.fn().mockRejectedValue('unexpected rejection');
    const adapter = createSimulationBrokerAdapter({ submitOrder });

    const result = await adapter.submitOrder(makeRequest(), makeContext());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Simulation order submission failed.');
      expect(result.code).toBe('ADAPTER_SUBMIT_FAILED');
    }
  });

  it('filledAt is a Date constructed from order.executedAt', async () => {
    const executedAt = '2024-06-15T10:30:00.000Z';
    const order = makeOrder({ executedAt });
    const submitOrder = vi.fn().mockResolvedValue(order);
    const adapter = createSimulationBrokerAdapter({ submitOrder });

    const result = await adapter.submitOrder(makeRequest(), makeContext());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.filledAt.toISOString()).toBe(executedAt);
    }
  });

  it('handles a sell order result correctly', async () => {
    const order = makeOrder({ side: 'sell', realizedPnl: 120, cashEffect: 895 });
    const submitOrder = vi.fn().mockResolvedValue(order);
    const adapter = createSimulationBrokerAdapter({ submitOrder });
    const request = makeRequest({ side: 'sell' });

    const result = await adapter.submitOrder(request, makeContext());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.side).toBe('sell');
      expect(result.value.executionTarget).toBe('simulation');
    }
  });
});
