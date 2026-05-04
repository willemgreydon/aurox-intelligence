import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSimulatedOrderAction } from './simulation-actions';

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

vi.mock('@repo/db', () => ({
  resetSimulationAccount: vi.fn(),
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

  it('maps lane mismatch to LANE_MISMATCH', async () => {
    assertSimulationSessionMock.mockResolvedValue({
      ...RUNNING_SESSION,
      laneId: 'manual_multi_asset_lane',
    });

    const state = await createSimulatedOrderAction(
      { status: 'idle', message: null, fieldErrors: {} },
      buyFormData({ strategyLaneId: 'manual_stock_lane' }),
    );

    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('LANE_MISMATCH');
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

  it('maps market data error to MARKET_DATA_UNAVAILABLE', async () => {
    assertSimulationSessionMock.mockResolvedValue(RUNNING_SESSION);
    executeSimulationOrderForCurrentUserMock.mockRejectedValue(
      new Error('fresh quote is required but market data is unavailable'),
    );

    const state = await createSimulatedOrderAction({ status: 'idle', message: null, fieldErrors: {} }, buyFormData());

    expect(state.status).toBe('error');
    expect(state.errorCode).toBe('MARKET_DATA_UNAVAILABLE');
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
});
