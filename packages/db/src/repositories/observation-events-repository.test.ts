import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listObservationEvents,
  markObservationEventPinned,
  markObservationEventRead,
  upsertObservationEvents,
} from './observation-events-repository';

const createDatabaseClientMock = vi.fn();

vi.mock('../client', () => ({
  createDatabaseClient: () => createDatabaseClientMock(),
}));

function makeClient(isConfigured = true) {
  return {
    isConfigured,
    query: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(async (callback) => callback({
      query: vi.fn().mockResolvedValue([{ id: 'event-1' }]),
      execute: vi.fn(),
    })),
  };
}

describe('observation-events-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts events with dedupe-friendly fingerprint path', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);
    const ids = await upsertObservationEvents([
      {
        source: 'signal',
        eventType: 'signal_flip',
        severity: 'WATCH',
        title: 'AAPL signal',
        description: 'Signal moved to watch.',
        observedAt: new Date().toISOString(),
      },
    ]);
    expect(ids).toHaveLength(1);
    expect(client.transaction).toHaveBeenCalledTimes(1);
  });

  it('lists with fallback empty when db is disabled', async () => {
    createDatabaseClientMock.mockReturnValue(makeClient(false));
    const rows = await listObservationEvents({ userId: 'u1' });
    expect(rows).toEqual([]);
  });

  it('executes state mutations for read/pin', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);
    await markObservationEventRead('event-1', '00000000-0000-0000-0000-000000000001');
    await markObservationEventPinned('event-1', '00000000-0000-0000-0000-000000000001');
    expect(client.execute).toHaveBeenCalledTimes(2);
  });
});
