import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminRevokeUserSessions, adminSetUserStatus } from './auth-repository';

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
    query: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn(),
  };
  // Transaction runs its callback against the same mock client (single connection).
  client.transaction.mockImplementation((cb: (c: MockClient) => Promise<unknown>) => cb(client));
  return client;
}

function insertedEventType(client: MockClient): string | null {
  const insertCall = client.execute.mock.calls.find(([sql]) => String(sql).includes('insert into'));
  if (!insertCall) return null;
  const match = String(insertCall[0]).match(/values \(\$1, '([^']+)'/);
  return match?.[1] ?? null;
}

describe('admin account lifecycle (audited writes)', () => {
  beforeEach(() => {
    createDatabaseClientMock.mockReset();
  });

  it('disables a user, revokes their sessions, and audits it in one transaction', async () => {
    const client = makeClient();
    // 1st query: SELECT status FOR UPDATE. 2nd query: findUserByIdWithClient.
    client.query.mockResolvedValueOnce([{ status: 'active' }]).mockResolvedValue([]);
    createDatabaseClientMock.mockReturnValue(client);

    await adminSetUserStatus({
      userId: 'user-1',
      status: 'disabled',
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
    });

    expect(client.transaction).toHaveBeenCalledTimes(1);
    // Disabling must revoke sessions.
    const revokedSessions = client.execute.mock.calls.some(
      ([sql]) => String(sql).includes('update') && String(sql).includes('revoked_at'),
    );
    expect(revokedSessions).toBe(true);
    // Audit row is a user_status_changed event.
    expect(insertedEventType(client)).toBe('user_status_changed');
  });

  it('reactivating does NOT revoke sessions', async () => {
    const client = makeClient();
    client.query.mockResolvedValueOnce([{ status: 'disabled' }]).mockResolvedValue([]);
    createDatabaseClientMock.mockReturnValue(client);

    await adminSetUserStatus({
      userId: 'user-1',
      status: 'active',
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
    });

    const revokedSessions = client.execute.mock.calls.some(
      ([sql]) => String(sql).includes('revoked_at'),
    );
    expect(revokedSessions).toBe(false);
    expect(insertedEventType(client)).toBe('user_status_changed');
  });

  it('returns null when the target user does not exist (no audit written)', async () => {
    const client = makeClient();
    client.query.mockResolvedValue([]); // no status row
    createDatabaseClientMock.mockReturnValue(client);

    const result = await adminSetUserStatus({
      userId: 'missing',
      status: 'disabled',
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
    });

    expect(result).toBeNull();
    expect(client.execute).not.toHaveBeenCalled();
  });

  it('force-logout revokes all sessions and audits the revoked count', async () => {
    const client = makeClient();
    client.query.mockResolvedValueOnce([{ count: '3' }]).mockResolvedValue([]);
    createDatabaseClientMock.mockReturnValue(client);

    const count = await adminRevokeUserSessions({
      userId: 'user-1',
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
    });

    expect(count).toBe(3);
    expect(insertedEventType(client)).toBe('user_sessions_revoked');
  });
});
