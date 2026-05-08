import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dismissAlert,
  listAlerts,
  resolveAlert,
  snoozeAlert,
  updateAlertState,
  upsertAlerts,
} from './alerts-repository';

const createDatabaseClientMock = vi.fn();

vi.mock('../client', () => ({
  createDatabaseClient: () => createDatabaseClientMock(),
}));

function makeClient(isConfigured = true) {
  return {
    isConfigured,
    query: vi.fn().mockResolvedValue([]),
    execute: vi.fn(),
    transaction: vi.fn(async (callback) => callback({
      query: vi.fn().mockResolvedValue([{ id: 'alert-1' }]),
      execute: vi.fn(),
    })),
  };
}

describe('alerts-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts alerts with dedupe semantics', async () => {
    const client = makeClient(true);
    createDatabaseClientMock.mockReturnValue(client);
    const ids = await upsertAlerts([
      {
        source: 'anomaly',
        category: 'anomaly',
        severity: 'WARNING',
        title: 'Volatility spike',
        description: 'Detected volatility expansion.',
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
    ]);
    expect(ids).toEqual(['alert-1']);
    expect(client.transaction).toHaveBeenCalledTimes(1);
  });

  it('returns empty lists when DB is unavailable', async () => {
    createDatabaseClientMock.mockReturnValue(makeClient(false));
    const rows = await listAlerts({ userId: 'u1' });
    expect(rows).toEqual([]);
  });

  it('supports alert state transitions', async () => {
    const client = makeClient(true);
    createDatabaseClientMock.mockReturnValue(client);
    await updateAlertState('a1', '00000000-0000-0000-0000-000000000001', 'PINNED');
    await snoozeAlert('a1', '00000000-0000-0000-0000-000000000001', new Date().toISOString());
    await dismissAlert('a1', '00000000-0000-0000-0000-000000000001');
    await resolveAlert('a1', '00000000-0000-0000-0000-000000000001');
    expect(client.execute).toHaveBeenCalledTimes(4);
  });
});
