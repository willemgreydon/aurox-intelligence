import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  executeSimulationOrder,
  getTodayAiSimulationOrderNotionalForUser,
  insertSimulationAgentDecision,
  resetSimulationAccount,
} from './simulated-trading-repository';

const createDatabaseClientMock = vi.fn();

vi.mock('../client', () => ({
  createDatabaseClient: () => createDatabaseClientMock(),
}));

type MockClient = {
  isConfigured: boolean;
  query: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

function makeClient(): MockClient {
  const client: MockClient = {
    isConfigured: true,
    query: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
  };
  // Default: transaction delegates to the same mock client
  client.transaction.mockImplementation((cb: (c: MockClient) => Promise<unknown>) => cb(client));
  return client;
}

const existingAccountRow = {
  accountId: 'acc-1',
  portfolioId: 'port-1',
  currency: 'USD' as const,
  initialCashBalance: 100000,
  cashBalance: 100000,
  realizedPnl: 0,
  allowNegativeBalance: false,
  updatedAt: new Date().toISOString(),
};

describe('getTodayAiSimulationOrderNotionalForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads structured order link notional when metadata rows exist', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);
    client.query
      .mockResolvedValueOnce([existingAccountRow])
      .mockResolvedValueOnce([{ notional: '250.50', rowCount: 2 }]);

    const result = await getTodayAiSimulationOrderNotionalForUser('00000000-0000-0000-0000-000000000001');

    expect(result).toBe(250.5);
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('falls back to notes parsing when structured rows are unavailable', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);
    client.query
      .mockResolvedValueOnce([existingAccountRow])
      .mockResolvedValueOnce([{ notional: '0', rowCount: 0 }])
      .mockResolvedValueOnce([{ grossAmount: '125.00' }]);

    const result = await getTodayAiSimulationOrderNotionalForUser('00000000-0000-0000-0000-000000000001');

    expect(result).toBe(125);
    expect(client.query).toHaveBeenCalledTimes(3);
  });
});

describe('insertSimulationAgentDecision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a decision audit row with safe decision payload', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);
    client.query.mockResolvedValueOnce([{ id: 'decision-1' }]);

    const inserted = await insertSimulationAgentDecision({
      userId: '00000000-0000-0000-0000-000000000001',
      mode: 'suggest_only',
      action: 'HOLD',
      decisionJson: {
        decision: {
          action: 'HOLD',
          reasoning: 'No ranked context available.',
        },
      },
    });

    expect(inserted.id).toBe('decision-1');
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});

// ─── executeSimulationOrder ───────────────────────────────────────────────────

const USER_ID = '00000000-0000-0000-0000-000000000001';
const ASSET_ID = 'asset-googl';
const SYMBOL = 'GOOGL';

const accountRow = {
  accountId: 'acc-googl',
  portfolioId: 'port-googl',
  currency: 'USD' as const,
  initialCashBalance: '50000',
  cashBalance: '50000',
  realizedPnl: '0',
  allowNegativeBalance: false,
  updatedAt: new Date().toISOString(),
};

const orderRow = {
  id: 'order-1',
  assetId: ASSET_ID,
  symbol: SYMBOL,
  assetClass: 'stock',
  side: 'buy',
  status: 'filled',
  quantity: '1',
  requestedPrice: '401.07',
  executedPrice: '401.07',
  grossAmount: '401.07',
  cashEffect: '-401.07',
  realizedPnl: '0',
  notes: '',
  createdAt: new Date().toISOString(),
  executedAt: new Date().toISOString(),
};

const baseInput = {
  userId: USER_ID,
  assetId: ASSET_ID,
  symbol: SYMBOL,
  assetClass: 'stock' as const,
  strategyLaneId: 'manual_stock_lane' as const,
  executionPrice: 401.07,
  quantity: 1,
};

function makeSellClient(opts: {
  cashBalance?: number;
  heldQuantity?: number;
  averageCost?: number;
  fullSell?: boolean;
} = {}): MockClient {
  const {
    cashBalance = 49598.93, // after a prior buy
    heldQuantity = 1,
    averageCost = 401.07,
    fullSell = true,
  } = opts;

  const client = makeClient();

  // 1. ensureSimulationAccount
  client.query.mockResolvedValueOnce([accountRow]);
  // 2. lock account (FOR UPDATE)
  client.query.mockResolvedValueOnce([{ cashBalance: String(cashBalance), allowNegativeBalance: false }]);
  // 3. lock position (FOR UPDATE)
  client.query.mockResolvedValueOnce([{
    id: 'pos-1',
    assetId: ASSET_ID,
    symbol: SYMBOL,
    assetClass: 'stock',
    quantity: String(heldQuantity),
    averageCost: String(averageCost),
    realizedPnl: '0',
    openedAt: new Date().toISOString(),
    closedAt: null,
    updatedAt: new Date().toISOString(),
  }]);
  // execute: update positions (sell path — the CASE query)
  client.execute.mockResolvedValue(undefined);
  // execute: update accounts
  // execute: insert orders
  // execute: insert transactions
  // queries for captureSnapshot
  client.query.mockResolvedValueOnce([{ cashBalance: String(cashBalance + 401.07), realizedPnl: '0' }]);
  client.query.mockResolvedValueOnce([{ marketValue: fullSell ? '0' : '401.07', costBasis: '0', positionCount: fullSell ? 0 : 1 }]);
  // execute: insert snapshot
  // final select: created order
  client.query.mockResolvedValueOnce([{ ...orderRow, side: 'sell', cashEffect: '401.07', realizedPnl: '0' }]);

  return client;
}

describe('executeSimulationOrder — sell path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes a sell order and uses ::timestamptz cast in the position update SQL', async () => {
    const client = makeSellClient();
    createDatabaseClientMock.mockReturnValue(client);

    const order = await executeSimulationOrder({ ...baseInput, side: 'sell' });

    expect(order.side).toBe('sell');
    expect(order.symbol).toBe(SYMBOL);

    // The first execute call is the position update (sell path).
    const [positionUpdateSql] = client.execute.mock.calls[0] as [string, unknown[]];
    expect(positionUpdateSql).toContain('::timestamptz');
    expect(positionUpdateSql).toContain('closed_at');
    expect(positionUpdateSql).toContain('case when');
  });

  it('rejects a sell when no position is held', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);

    // ensureSimulationAccount
    client.query.mockResolvedValueOnce([accountRow]);
    // lock account
    client.query.mockResolvedValueOnce([{ cashBalance: '50000', allowNegativeBalance: false }]);
    // no position row
    client.query.mockResolvedValueOnce([]);

    await expect(
      executeSimulationOrder({ ...baseInput, side: 'sell' }),
    ).rejects.toThrow(/insufficient position/i);
  });

  it('rejects a sell when quantity exceeds held position', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);

    client.query.mockResolvedValueOnce([accountRow]);
    client.query.mockResolvedValueOnce([{ cashBalance: '49598.93', allowNegativeBalance: false }]);
    client.query.mockResolvedValueOnce([{
      id: 'pos-1', assetId: ASSET_ID, symbol: SYMBOL, assetClass: 'stock',
      quantity: '1', averageCost: '401.07', realizedPnl: '0',
      openedAt: new Date().toISOString(), closedAt: null, updatedAt: new Date().toISOString(),
    }]);

    await expect(
      executeSimulationOrder({ ...baseInput, side: 'sell', quantity: 5 }),
    ).rejects.toThrow(/insufficient position/i);
  });

  it('executes a partial sell when quantity is less than held', async () => {
    const client = makeSellClient({ heldQuantity: 3, fullSell: false });
    createDatabaseClientMock.mockReturnValue(client);

    const order = await executeSimulationOrder({ ...baseInput, side: 'sell', quantity: 1 });

    expect(order.side).toBe('sell');
    // Position update SQL should set closed_at only when quantity reaches zero
    const [positionUpdateSql, positionUpdateParams] = client.execute.mock.calls[0] as [string, unknown[]];
    expect(positionUpdateSql).toContain('::timestamptz');
    // $2 param (nextQuantity) is 2, so CASE resolves to null (not closed)
    expect(positionUpdateParams[1]).toBe(2); // roundQuantity(3 - 1)
  });

  it('sets closed_at when full sell reduces quantity to zero', async () => {
    const client = makeSellClient({ heldQuantity: 1, fullSell: true });
    createDatabaseClientMock.mockReturnValue(client);

    await executeSimulationOrder({ ...baseInput, side: 'sell', quantity: 1 });

    const [positionUpdateSql, positionUpdateParams] = client.execute.mock.calls[0] as [string, unknown[]];
    expect(positionUpdateSql).toContain('::timestamptz');
    // $2 param (nextQuantity) is 0 — CASE will set closed_at to $4::timestamptz
    expect(positionUpdateParams[1]).toBe(0);
    // $4 param is the ISO timestamp string
    expect(typeof positionUpdateParams[3]).toBe('string');
    expect(new Date(positionUpdateParams[3] as string).getTime()).not.toBeNaN();
  });

  it('buy path does not use CASE for closed_at (no regression)', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);

    client.query.mockResolvedValueOnce([accountRow]);
    client.query.mockResolvedValueOnce([{ cashBalance: '50000', allowNegativeBalance: false }]);
    // no existing position for buy
    client.query.mockResolvedValueOnce([]);
    client.execute.mockResolvedValue(undefined);
    client.query.mockResolvedValueOnce([{ cashBalance: '49598.93', realizedPnl: '0' }]);
    client.query.mockResolvedValueOnce([{ marketValue: '401.07', costBasis: '401.07', positionCount: 1 }]);
    client.query.mockResolvedValueOnce([orderRow]);

    await executeSimulationOrder({ ...baseInput, side: 'buy' });

    // First execute is the INSERT into positions (buy path with no existing position)
    const [firstSql] = client.execute.mock.calls[0] as [string, unknown[]];
    // Buy INSERT path — should not contain a CASE expression for closed_at
    expect(firstSql).not.toMatch(/case when.*closed_at/i);
  });
});

// ─── executeSimulationOrder — buy success + guards ────────────────────────────

describe('executeSimulationOrder — buy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeBuyClient(opts: { cashBalance?: number } = {}): MockClient {
    const { cashBalance = 50000 } = opts;
    const client = makeClient();
    // 1. ensureSimulationAccount
    client.query.mockResolvedValueOnce([accountRow]);
    // 2. lock account FOR UPDATE
    client.query.mockResolvedValueOnce([{ cashBalance: String(cashBalance), allowNegativeBalance: false }]);
    // 3. lock position — none held yet
    client.query.mockResolvedValueOnce([]);
    client.execute.mockResolvedValue(undefined);
    // captureSnapshot reads
    client.query.mockResolvedValueOnce([{ cashBalance: String(cashBalance - 401.07), realizedPnl: '0' }]);
    client.query.mockResolvedValueOnce([{ marketValue: '401.07', costBasis: '401.07', positionCount: 1 }]);
    // final select: created order
    client.query.mockResolvedValueOnce([orderRow]);
    return client;
  }

  it('executes a buy: returns a filled order and atomically writes account/order/transaction', async () => {
    const client = makeBuyClient();
    createDatabaseClientMock.mockReturnValue(client);

    const order = await executeSimulationOrder({ ...baseInput, side: 'buy' });

    expect(order.side).toBe('buy');
    expect(order.symbol).toBe(SYMBOL);
    expect(order.status).toBe('filled');

    const executeSql = client.execute.mock.calls.map((c) => String(c[0]));

    // Cash is deducted on the account update (cash_balance set below the prior balance).
    const accountUpdate = client.execute.mock.calls.find((c) => String(c[0]).includes('cash_balance = $2'));
    expect(accountUpdate).toBeDefined();
    const nextCash = (accountUpdate![1] as unknown[])[1] as number;
    expect(nextCash).toBeLessThan(50000);
    expect(nextCash).toBeGreaterThan(0);

    // Order row is inserted (audit trail), with side 'buy'.
    const orderInsert = client.execute.mock.calls.find((c) => String(c[0]).includes('order_type'));
    expect(orderInsert).toBeDefined();
    expect(orderInsert![1] as unknown[]).toContain('buy');

    // A transaction row is inserted (auditability) — multi-table atomic write.
    expect(executeSql.some((sql) => /insert into .*transaction/i.test(sql))).toBe(true);
  });

  it('rejects a buy when cash balance is insufficient (fail-closed, no state mutation)', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);

    client.query.mockResolvedValueOnce([accountRow]); // ensure account
    client.query.mockResolvedValueOnce([{ cashBalance: '100', allowNegativeBalance: false }]); // locked account
    client.query.mockResolvedValueOnce([]); // no position

    await expect(
      executeSimulationOrder({ ...baseInput, side: 'buy' }),
    ).rejects.toThrow(/insufficient fictive cash/i);

    // No mutation may occur on a rejected order.
    expect(client.execute).not.toHaveBeenCalled();
  });

  it('rejects an order whose quantity rounds to zero (minimum order size guard)', async () => {
    // NOTE: executeSimulationOrder enforces a quantity>0 floor; true min_notional
    // sizing is enforced upstream (position-sizing). A sub-precision quantity
    // passes the positive() schema but rounds to 0 and must be rejected here.
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);
    client.query.mockResolvedValueOnce([accountRow]); // ensure account

    await expect(
      // 1e-9 passes the positive() schema but rounds to 0 at the 1e-8 quantity grid.
      executeSimulationOrder({ ...baseInput, side: 'buy', quantity: 1e-9 }),
    ).rejects.toThrow(/greater than zero/i);

    expect(client.execute).not.toHaveBeenCalled();
  });
});

// ─── resetSimulationAccount — archive, not delete ─────────────────────────────

describe('resetSimulationAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('archives positions (UPDATE quantity=0/closed_at), resets cash, and logs a reset transaction — never deletes', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);

    client.query.mockResolvedValueOnce([existingAccountRow]); // ensureSimulationAccount
    client.execute.mockResolvedValue(undefined);
    // captureSnapshot reads
    client.query.mockResolvedValueOnce([{ cashBalance: '100000', realizedPnl: '0' }]);
    client.query.mockResolvedValueOnce([{ marketValue: '0', costBasis: '0', positionCount: 0 }]);

    await expect(resetSimulationAccount(USER_ID)).resolves.toBeUndefined();

    const executeSql = client.execute.mock.calls.map((c) => String(c[0]));

    // Positions are ARCHIVED, not deleted: the first execute is an UPDATE that
    // zeroes quantity and stamps closed_at.
    const positionsArchive = executeSql[0]!;
    expect(positionsArchive).toMatch(/update/i);
    expect(positionsArchive).toContain('quantity = 0');
    expect(positionsArchive).toContain('closed_at');

    // Account cash is reset to the initial balance.
    const accountReset = client.execute.mock.calls.find((c) => String(c[0]).includes('cash_balance = $2'));
    expect(accountReset).toBeDefined();
    expect((accountReset![1] as unknown[])[1]).toBe(100000);

    // A 'reset' transaction is appended (auditability).
    expect(executeSql.some((sql) => sql.includes("'reset'"))).toBe(true);

    // Auditability invariant: the reset must NEVER delete or truncate history.
    expect(executeSql.some((sql) => /delete\s+from|truncate/i.test(sql))).toBe(false);
  });
});
