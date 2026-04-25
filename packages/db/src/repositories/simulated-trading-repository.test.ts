import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getTodayAiSimulationOrderNotionalForUser,
  insertSimulationAgentDecision,
} from './simulated-trading-repository';

const createDatabaseClientMock = vi.fn();

vi.mock('../client', () => ({
  createDatabaseClient: () => createDatabaseClientMock(),
}));

type MockClient = {
  isConfigured: boolean;
  query: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
};

function makeClient(): MockClient {
  return {
    isConfigured: true,
    query: vi.fn(),
    execute: vi.fn(),
  };
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
