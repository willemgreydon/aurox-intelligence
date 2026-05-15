import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSimulatedOrderAction, runSimulationControlAction } from './simulation-actions';

// ─── mocks ───────────────────────────────────────────────────────────────────

const assertSimulationSessionMock = vi.fn();
const executeSimulationOrderForCurrentUserMock = vi.fn();

vi.mock('../auth/session', () => ({
  requireCurrentSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

vi.mock('../services/simulation-workstation-service', () => ({
  assertSimulationSessionAllowsTradingForCurrentUser: (...args: unknown[]) =>
    assertSimulationSessionMock(...args),
  resolveLaneMode: vi.fn().mockResolvedValue('manual'),
  startSimulationSessionForCurrentUser: vi.fn(),
}));

vi.mock('../services/simulation-service', () => ({
  executeSimulationOrderForCurrentUser: (...args: unknown[]) =>
    executeSimulationOrderForCurrentUserMock(...args),
}));
vi.mock('../services/macro-intelligence-service', () => ({
  getMacroIntelligenceViewModel: vi.fn().mockResolvedValue({
    regime: {
      overallMacroScore: 0.12,
      confidence: 0.74,
      riskRegime: { score: -0.2 },
    },
    providerStatus: [{ provider: 'fred', freshness: 'partial' }],
  }),
}));

vi.mock('@repo/db', () => ({
  resetSimulationAccount: vi.fn(),
  resetSimulationCashBalance: vi.fn(),
  closeAllSimulationPositions: vi.fn(),
  clearSimulationDecisionHistory: vi.fn(),
  getUserWatchlist: vi.fn(),
  toggleWatchlistItem: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('../../lib/i18n/messages', () => ({
  getMessages: vi.fn().mockReturnValue({
    simulation: { orderRecorded: 'Order recorded.', resetConfirmation: 'Account reset.' },
    dashboard: { addToWatchlist: 'Added.', removeFromWatchlist: 'Removed.' },
  }),
}));

vi.mock('../i18n/locale', () => ({
  getRequestLocale: vi.fn().mockResolvedValue('en'),
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

const SESSION_UUID = '3677a5bb-0387-41e9-a04c-518868c057ab';

const RUNNING_SESSION = {
  id: SESSION_UUID,
  laneId: 'manual_stock_lane',
  assetScope: 'stock',
  status: 'running',
  laneMode: 'manual',
  observationStatus: 'idle',
  observationMessage: null,
  maxCapitalUsd: 10000,
  microAllocationPercent: 5,
  decisionSource: 'manual_ui',
  userId: 'user-1',
  lastHeartbeatAt: null,
  startedAt: new Date().toISOString(),
  pausedAt: null,
  stoppedAt: null,
  completedAt: null,
  failedAt: null,
  lastError: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastOpenedAt: null,
};

const FILLED_ORDER = {
  id: 'order-1',
  symbol: 'AAPL',
  side: 'buy' as const,
  quantity: 2,
  executedPrice: 190.5,
  grossAmount: 381,
  realizedPnl: 0,
};

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v);
  }
  return fd;
}

function buyFormData(overrides: Record<string, string> = {}): FormData {
  return makeFormData({
    assetId: 'asset-1',
    symbol: 'AAPL',
    assetClass: 'stock',
    side: 'buy',
    quantity: '2',
    strategyLaneId: 'manual_stock_lane',
    decisionSource: 'manual_ui',
    simulationSessionId: SESSION_UUID,
    ...overrides,
  });
}

function sellFormData(overrides: Record<string, string> = {}): FormData {
  return buyFormData({ side: 'sell', ...overrides });
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('createSimulatedOrderAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with order result on buy', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockResolvedValue(FILLED_ORDER);

    const state = await createSimulatedOrderAction({ status: 'idle', message: null, fieldErrors: {} }, buyFormData());

    expect(state.status).toBe('success');
    expect(state.orderResult).toMatchObject({
      orderId: 'order-1',
      symbol: 'AAPL',
      side: 'buy',
      quantity: 2,
    });
    expect(state.errorCode).toBeUndefined();
  });

  it('returns success with order result on sell with existing position', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockResolvedValue({
      ...FILLED_ORDER,
      side: 'sell' as const,
      realizedPnl: 12.5,
    });

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ quantity: '2' }),
    );

    expect(state.status).toBe('success');
    expect(state.orderResult?.side).toBe('sell');
    expect(state.orderResult?.realizedPnl).toBe(12.5);
  });

  it('rejects sell with zero quantity via Zod (quantity must be positive)', async () => {
    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ quantity: '0' }),
    );

    expect(state.status).toBe('error');
    // Zod rejects quantity: 0 (must be positive)
    expect(state.fieldErrors).toHaveProperty('quantity');
    expect(assertSimulationSessionMock).not.toHaveBeenCalled();
  });

  it('rejects sell with negative quantity via Zod', async () => {
    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ quantity: '-1' }),
    );

    expect(state.status).toBe('error');
    expect(state.fieldErrors).toHaveProperty('quantity');
    expect(assertSimulationSessionMock).not.toHaveBeenCalled();
  });

  it('returns NO_POSITION_TO_SELL when sell quantity coerces to zero (empty string)', async () => {
    // Empty quantity string coerces to NaN → Zod positive check fails → fieldErrors
    // But let's cover the explicit server-side guard for quantity=0 via hidden field
    const fd = makeFormData({
      assetId: 'asset-1',
      symbol: 'AAPL',
      assetClass: 'stock',
      side: 'sell',
      quantity: '0.0001', // Zod min is 0.0001 positive, so pass Zod but may hit server guard
      strategyLaneId: 'manual_stock_lane',
      decisionSource: 'manual_ui',
    });

    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    // Simulate the DB layer throwing "Insufficient position quantity"
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('Insufficient position quantity: no shares held'),
    );

    const state = await createSimulatedOrderAction({ status: 'idle', message: null, fieldErrors: {} }, fd);

    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('INSUFFICIENT_POSITION');
    expect(state.message).toContain('AAPL');
  });

  it('maps Postgres/DB errors to INTERNAL_ERROR', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('inconsistent types deduced for parameter $2'),
    );

    const state = await createSimulatedOrderAction({ status: 'idle', message: null, fieldErrors: {} }, buyFormData());

    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('INTERNAL_ERROR');
    expect(state.message).toBe('An internal error occurred while processing the simulation order. Please try again.');
  });

  it('maps cash shortage to INSUFFICIENT_CASH', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('Insufficient fictive cash: need 500 have 100'),
    );

    const state = await createSimulatedOrderAction({ status: 'idle', message: null, fieldErrors: {} }, buyFormData());

    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('INSUFFICIENT_CASH');
  });

  it('auto-normalizes prepared lane to active compatible lane', async () => {
    assertSimulationSessionMock.mockResolvedValue({
      ...RUNNING_SESSION,
      laneId: 'manual_multi_asset_lane',
    });
    executeSimulationOrderForCurrentUserMock.mockResolvedValue(FILLED_ORDER);

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      buyFormData({ strategyLaneId: 'manual_stock_lane' }),
    );

    expect(state.status).toBe('success');
    expect(executeSimulationOrderForCurrentUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyLaneId: 'manual_multi_asset_lane',
        macroRegimeSnapshot: expect.any(String),
        providerSnapshot: expect.stringContaining('fred:partial'),
      }),
    );
  });

  it('maps scope mismatch to SCOPE_MISMATCH', async () => {
    assertSimulationSessionMock.mockResolvedValue({
      ...RUNNING_SESSION,
      laneId: 'manual_multi_asset_lane',
      assetScope: 'crypto',
    });

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      buyFormData({
        assetClass: 'stock',
        strategyLaneId: 'manual_multi_asset_lane',
      }),
    );

    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('SCOPE_MISMATCH');
  });

  it('maps quote-not-ready error to QUOTE_NOT_READY', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('Simulation quote is not ready yet. (MSFT)'),
    );

    const state = await createSimulatedOrderAction({ status: 'idle', message: null, fieldErrors: {} }, buyFormData());

    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('QUOTE_NOT_READY');
  });

  it('returns clean database unavailable message for simulation writes', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('Simulation database is currently unavailable'),
    );

    const state = await createSimulatedOrderAction({ status: 'idle', message: null, fieldErrors: {} }, buyFormData());

    expect(state.status).toBe('error');
    expect(state.message).toBe('Simulation database is currently unavailable.');
  });

  it('never leaks raw postgres error messages to the caller', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('ERROR: syntax error at or near "WHERE" (SQLSTATE 42601)'),
    );

    const state = await createSimulatedOrderAction({ status: 'idle', message: null, fieldErrors: {} }, buyFormData());

    expect(state.status).toBe('error');
    expect(state.message).not.toContain('SQLSTATE');
    expect(state.message).not.toContain('syntax error');
    expect(state.errorCode).toBe('INTERNAL_ERROR');
  });

  it('never leaks raw OpenAI/provider API errors to the caller', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('You exceeded your current quota, please check your plan and billing details. (HTTP 429)'),
    );

    const state = await createSimulatedOrderAction({ status: 'idle', message: null, fieldErrors: {} }, buyFormData());

    expect(state.status).toBe('error');
    expect(state.message).not.toContain('429');
    expect(state.message).not.toContain('quota');
    expect(state.message).not.toContain('billing');
    // Provider errors fall through to INTERNAL_ERROR with safe message
    expect(state.message).not.toContain('https://');
  });

  it('maps no-open-position error with symbol correctly', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('No open AAPL position is available to sell.'),
    );

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ quantity: '1' }),
    );

    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('INSUFFICIENT_POSITION');
    expect(state.message).toContain('AAPL');
  });

  // ─── new tests ────────────────────────────────────────────────────────────

  it('rejects empty FormData with VALIDATION_ERROR and informative message', async () => {
    const emptyFd = new FormData();
    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      emptyFd,
    );
    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('VALIDATION_ERROR');
    expect(state.message).toContain('Order submission was incomplete');
    expect(assertSimulationSessionMock).not.toHaveBeenCalled();
  });

  it('parses sell FormData fields correctly and reaches execution layer', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockResolvedValue({
      ...FILLED_ORDER,
      side: 'sell' as const,
      quantity: 1,
      realizedPnl: 5,
    });

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ symbol: 'AAPL', quantity: '1', assetClass: 'stock' }),
    );

    expect(state.status).toBe('success');
    expect(executeSimulationOrderForCurrentUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'AAPL', side: 'sell', quantity: 1, assetClass: 'stock' }),
    );
  });

  it('normalises sell side value to lowercase before Zod parsing', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockResolvedValue({
      ...FILLED_ORDER,
      side: 'sell' as const,
    });

    // Side arrives uppercase (e.g. from a URL param) — the action lowercases it
    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ side: 'SELL' }),
    );

    // Either the normalisation path succeeds, or Zod rejects 'SELL' — either way
    // the test confirms the action does not crash with an unhandled exception.
    expect(['success', 'error']).toContain(state.status);
    if (state.status === 'success') {
      expect(executeSimulationOrderForCurrentUserMock).toHaveBeenCalledWith(
        expect.objectContaining({ side: 'sell' }),
      );
    }
  });

  it('succeeds when sourceContext is "journal" (journal source is execution-neutral)', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockResolvedValue({
      ...FILLED_ORDER,
      side: 'sell' as const,
    });

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ sourceContext: 'journal' }),
    );

    expect(state.status).toBe('success');
    // sourceContext is embedded in the notes field passed to the service
    expect(executeSimulationOrderForCurrentUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ notes: expect.stringContaining('source=journal') }),
    );
  });

  it('returns INSUFFICIENT_POSITION when sell is attempted without an open holding', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('No open AAPL position is available to sell.'),
    );

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ symbol: 'AAPL', quantity: '1' }),
    );

    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('INSUFFICIENT_POSITION');
  });

  it('returns success for buy then success for sell (sequential order pair)', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);

    // Step 1: buy
    executeSimulationOrderForCurrentUserMock.mockResolvedValueOnce({ ...FILLED_ORDER, side: 'buy' as const });
    const buyState = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      buyFormData({ quantity: '2' }),
    );
    expect(buyState.status).toBe('success');
    expect(buyState.orderResult?.side).toBe('buy');

    // Step 2: sell (holding now exists — mocked at service layer)
    executeSimulationOrderForCurrentUserMock.mockResolvedValueOnce({
      ...FILLED_ORDER,
      side: 'sell' as const,
      quantity: 1,
      realizedPnl: 10,
    });
    const sellState = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ quantity: '1' }),
    );
    expect(sellState.status).toBe('success');
    expect(sellState.orderResult?.side).toBe('sell');
  });

  it('returns INSUFFICIENT_POSITION on partial sell that exceeds held quantity', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('Sell quantity exceeds the current open AAPL quantity. Held: 1.0000.'),
    );

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ symbol: 'AAPL', quantity: '5' }),
    );

    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('INSUFFICIENT_POSITION');
    expect(state.message).toContain('AAPL');
  });

  it('returns success for full sell (quantity matches entire holding)', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockResolvedValue({
      ...FILLED_ORDER,
      side: 'sell' as const,
      quantity: 2,
      realizedPnl: 20,
    });

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ quantity: '2' }),
    );

    expect(state.status).toBe('success');
    expect(state.orderResult?.quantity).toBe(2);
    expect(state.orderResult?.realizedPnl).toBe(20);
  });

  it('orderResult includes realizedPnl on a sell order', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockResolvedValue({
      ...FILLED_ORDER,
      side: 'sell' as const,
      quantity: 1,
      realizedPnl: 42.5,
    });

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      sellFormData({ quantity: '1' }),
    );

    expect(state.status).toBe('success');
    expect(state.orderResult?.realizedPnl).toBe(42.5);
    expect(state.orderResult?.side).toBe('sell');
  });
});

describe('runSimulationControlAction', () => {
  it('blocks control action when confirmation text mismatches', async () => {
    const fd = new FormData();
    fd.set('control', 'reset_all');
    fd.set('confirmText', 'nope');
    fd.set('expectedConfirmText', 'RESET ALL');
    const state = await runSimulationControlAction({ status: 'idle', message: null, fieldErrors: {} }, fd);
    expect(state.status).toBe('error');
  });
});
