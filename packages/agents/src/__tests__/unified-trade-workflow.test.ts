import { describe, expect, it, vi } from 'vitest';

import { runUnifiedTradeWorkflow } from '../workflows/unified-trade-workflow';
import { agentError, agentOk } from '../types/agent-types';
import type { UnifiedTradeWorkspaceDeps } from '../workflows/unified-trade-workflow';
import {
  makeAdapter,
  makeBundle,
  makeContext,
  makeIntent,
  makeModeConfig,
  makeOrderResult,
  makeSummary,
  makeWorkspace,
  okAdapterSubmit,
} from './execution-fixtures';
import type { SimulationWorkspace } from '@repo/api-contracts';

// These tests drive the workflow through the REAL broker supervisor and risk
// gate (no mocked risk gate — AUR-042). Only the external boundaries are stubbed:
// workspace load, market price, asset resolution and the broker adapter.
function makeDeps(overrides: Partial<UnifiedTradeWorkspaceDeps> = {}, workspace: SimulationWorkspace = makeWorkspace()): UnifiedTradeWorkspaceDeps {
  return {
    loadWorkspace: vi.fn(async () => workspace),
    loadMarketPrice: vi.fn(async () => 100),
    resolveAssetId: vi.fn(async () => 'asset-aapl'),
    ...overrides,
  };
}

describe('runUnifiedTradeWorkflow', () => {
  it('simulation buy: routes through the real risk gate and submits the sized order', async () => {
    const submitOrder = vi.fn(okAdapterSubmit(makeOrderResult({ side: 'buy', quantity: 10 })));
    const adapter = makeAdapter(submitOrder, 'simulation');

    const result = await runUnifiedTradeWorkflow(
      makeIntent({ side: 'buy', sizingMode: 'notional', notional: 1000 }),
      makeModeConfig(),
      makeBundle(),
      makeContext(),
      adapter,
      makeDeps(),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.packet.orderState).toBe('approved');
      expect(result.value.order.orderId).toBe('exec-order-1');
    }
    // notional 1000 / price 100 = quantity 10
    expect(submitOrder).toHaveBeenCalledTimes(1);
    expect(submitOrder.mock.calls[0]![0]).toMatchObject({ side: 'buy', quantity: 10 });
  });

  it('simulation sell: closes a held position without buy-capital gating', async () => {
    const submitOrder = vi.fn(okAdapterSubmit(makeOrderResult({ side: 'sell', quantity: 5 })));
    const adapter = makeAdapter(submitOrder, 'simulation');

    const result = await runUnifiedTradeWorkflow(
      makeIntent({ side: 'sell', sizingMode: 'quantity', notional: undefined, quantity: 5 }),
      makeModeConfig(),
      makeBundle(),
      makeContext(),
      adapter,
      // Zero cash must NOT block a sell.
      makeDeps({}, makeWorkspace({ summary: makeSummary({ cashBalance: 0, availableCash: 0 }) })),
    );

    expect(result.ok).toBe(true);
    expect(submitOrder.mock.calls[0]![0]).toMatchObject({ side: 'sell', quantity: 5 });
  });

  it('risk gate fail: real capital guard blocks a zero-cash buy (no mocked gate)', async () => {
    const submitOrder = vi.fn(okAdapterSubmit());
    const adapter = makeAdapter(submitOrder, 'simulation');

    const result = await runUnifiedTradeWorkflow(
      makeIntent({ side: 'buy' }),
      makeModeConfig(),
      makeBundle(),
      makeContext(),
      adapter,
      makeDeps({}, makeWorkspace({ summary: makeSummary({ cashBalance: 0, availableCash: 0 }) })),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('CAPITAL_GUARD_NO_CASH');
    }
    // Fail-closed: the order must never reach the adapter.
    expect(submitOrder).not.toHaveBeenCalled();
  });

  it('policy fail: a disabled mode is rejected before submission', async () => {
    const submitOrder = vi.fn(okAdapterSubmit());
    const result = await runUnifiedTradeWorkflow(
      makeIntent(),
      makeModeConfig({ enabled: false }),
      makeBundle(),
      makeContext(),
      makeAdapter(submitOrder, 'simulation'),
      makeDeps(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('SUPERVISOR_POLICY_REJECTED');
    }
    expect(submitOrder).not.toHaveBeenCalled();
  });

  it('mode routing: rejects when adapter target does not match config target', async () => {
    const submitOrder = vi.fn(okAdapterSubmit());
    const result = await runUnifiedTradeWorkflow(
      makeIntent(),
      makeModeConfig({ executionTarget: 'simulation' }),
      makeBundle(),
      makeContext(),
      makeAdapter(submitOrder, 'live'), // mismatch
      makeDeps(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('WORKFLOW_TARGET_MISMATCH');
    }
    expect(submitOrder).not.toHaveBeenCalled();
  });

  it('awaiting approval: ai_autonomous under human-approval mode blocks at the workflow', async () => {
    const submitOrder = vi.fn(okAdapterSubmit());
    const result = await runUnifiedTradeWorkflow(
      makeIntent({ source: 'ai_autonomous' }),
      makeModeConfig({ requireHumanApproval: true }),
      makeBundle(),
      makeContext(),
      makeAdapter(submitOrder, 'simulation'),
      makeDeps(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('WORKFLOW_AWAITING_APPROVAL');
    }
    expect(submitOrder).not.toHaveBeenCalled();
  });

  it('zero quantity: rejects when sizing yields no quantity', async () => {
    const submitOrder = vi.fn(okAdapterSubmit());
    const result = await runUnifiedTradeWorkflow(
      // sizingMode 'quantity' with no quantity provided → resolves to 0
      makeIntent({ sizingMode: 'quantity', notional: undefined, quantity: undefined }),
      makeModeConfig(),
      makeBundle(),
      makeContext(),
      makeAdapter(submitOrder, 'simulation'),
      makeDeps(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('WORKFLOW_ZERO_QUANTITY');
    }
    expect(submitOrder).not.toHaveBeenCalled();
  });

  it('missing boundary data: surfaces typed errors for workspace/price/asset', async () => {
    const adapter = makeAdapter(vi.fn(okAdapterSubmit()), 'simulation');

    const noWorkspace = await runUnifiedTradeWorkflow(
      makeIntent(), makeModeConfig(), makeBundle(), makeContext(), adapter,
      makeDeps({ loadWorkspace: vi.fn(async () => null) }),
    );
    expect(noWorkspace).toMatchObject({ ok: false, code: 'WORKFLOW_NO_WORKSPACE' });

    const noPrice = await runUnifiedTradeWorkflow(
      makeIntent(), makeModeConfig(), makeBundle(), makeContext(), adapter,
      makeDeps({ loadMarketPrice: vi.fn(async () => null) }),
    );
    expect(noPrice).toMatchObject({ ok: false, code: 'WORKFLOW_NO_PRICE' });

    const noAsset = await runUnifiedTradeWorkflow(
      makeIntent(), makeModeConfig(), makeBundle(), makeContext(), adapter,
      makeDeps({ resolveAssetId: vi.fn(async () => null) }),
    );
    expect(noAsset).toMatchObject({ ok: false, code: 'WORKFLOW_ASSET_NOT_FOUND' });
  });

  it('adapter failure: propagates the adapter error code', async () => {
    const submitOrder = vi.fn(async () => agentError<ReturnType<typeof makeOrderResult>>('broker down', 'ADAPTER_UNAVAILABLE'));
    const result = await runUnifiedTradeWorkflow(
      makeIntent(),
      makeModeConfig(),
      makeBundle(),
      makeContext(),
      makeAdapter(submitOrder, 'simulation'),
      makeDeps(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('ADAPTER_UNAVAILABLE');
    }
  });

  // GAP (kill-switch-rule.md): runUnifiedTradeWorkflow does not consult any halt /
  // kill-switch state at entry. A governance kill switch exists at the app layer
  // (apps/web/lib/governance-gate.ts) but is NOT wired into this agents workflow,
  // so a halt cannot block execution here. Tracked as a follow-up — do not delete
  // this marker until the halt gate is wired in and asserted.
  it.todo('blocks execution when the kill switch / halt state is active (halt gate not wired into workflow)');
});
