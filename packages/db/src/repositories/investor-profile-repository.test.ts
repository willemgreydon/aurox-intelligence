import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendInvestorProfileVersion,
  getInvestorProfileVersion,
  getLatestInvestorProfile,
} from './investor-profile-repository';

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

function makeClient(isConfigured = true): MockClient {
  const client: MockClient = {
    isConfigured,
    query: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
  };
  client.transaction.mockImplementation((cb: (c: MockClient) => Promise<unknown>) => cb(client));
  return client;
}

/** A persisted row exactly as the SELECT aliases return it. */
function persistedRow(overrides: Record<string, unknown> = {}) {
  return {
    profileId: 'p-1',
    investorRef: 'u-1',
    version: 2,
    effectiveDate: '2026-01-01',
    lastReviewedAt: null,
    clientCategory: 'retail',
    brokerClassification: null,
    taxResidency: 'AT',
    baseCurrency: 'EUR',
    financialSituation: {
      regularIncome: null,
      investableAssets: 50000,
      liabilities: null,
      liquidityReserveRequirement: null,
    },
    objective: 'growth',
    strategy: null,
    horizon: 'long',
    riskTolerance: 'high',
    lossBearingCapacity: 'substantial',
    knowledge: 'advanced',
    experience: 'extensive',
    instrumentExperience: {},
    sustainabilityPreferences: null,
    completeness: 1,
    provenance: [],
    ...overrides,
  };
}

beforeEach(() => {
  createDatabaseClientMock.mockReset();
});

describe('getLatestInvestorProfile', () => {
  it('returns null when the database is not configured (stub client)', async () => {
    createDatabaseClientMock.mockReturnValue(makeClient(false));
    expect(await getLatestInvestorProfile('u-1')).toBeNull();
  });

  it('parses the highest-version row into a validated profile', async () => {
    const client = makeClient();
    client.query.mockResolvedValueOnce([persistedRow()]);
    createDatabaseClientMock.mockReturnValue(client);

    const profile = await getLatestInvestorProfile('u-1');
    expect(profile?.version).toBe(2);
    expect(profile?.riskTolerance).toBe('high');
    expect(profile?.lossBearingCapacity).toBe('substantial');
    // Query orders by version desc, limit 1.
    expect(client.query.mock.calls[0]![0]).toMatch(/order by version desc/i);
  });
});

describe('getInvestorProfileVersion', () => {
  it('returns the requested historical version', async () => {
    const client = makeClient();
    client.query.mockResolvedValueOnce([persistedRow({ version: 1 })]);
    createDatabaseClientMock.mockReturnValue(client);

    const profile = await getInvestorProfileVersion('u-1', 1);
    expect(profile?.version).toBe(1);
    expect(client.query.mock.calls[0]![1]).toEqual(['u-1', 1]);
  });
});

describe('appendInvestorProfileVersion', () => {
  it('assigns the next version (max+1) and never overwrites history', async () => {
    const client = makeClient();
    // 1) version lookup → next = 3, 2) insert returns the new row at version 3.
    client.query.mockResolvedValueOnce([{ next: 3 }]);
    client.query.mockResolvedValueOnce([persistedRow({ version: 3 })]);
    createDatabaseClientMock.mockReturnValue(client);

    const input = { ...persistedRow() } as never;
    // strip server-assigned fields to mimic InvestorProfileInput
    delete (input as Record<string, unknown>).profileId;
    delete (input as Record<string, unknown>).version;

    const result = await appendInvestorProfileVersion('u-1', input);
    expect(result.version).toBe(3);
    // The insert bound version $2 to the computed next value, not a caller value.
    const insertParams = client.query.mock.calls[1]![1] as unknown[];
    expect(insertParams[1]).toBe(3);
    // Ran inside a transaction.
    expect(client.transaction).toHaveBeenCalledTimes(1);
  });

  it('throws when the database is not configured', async () => {
    createDatabaseClientMock.mockReturnValue(makeClient(false));
    await expect(appendInvestorProfileVersion('u-1', {} as never)).rejects.toThrow(/DATABASE_URL/);
  });
});
