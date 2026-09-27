import type { TaxLotInput } from '@repo/api-contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyLotDecrements, createTaxLot, listOpenTaxLots } from './tax-lot-repository';

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

/** A persisted lot row exactly as the SELECT aliases return it. */
function lotRow(overrides: Record<string, unknown> = {}) {
  return {
    lotId: 'lot-1',
    instrumentSymbol: 'AAPL',
    jurisdiction: 'AT',
    taxAssetClass: 'securities_capital_gain',
    acquisitionDate: '2025-01-01',
    acquisitionQuantity: 10,
    acquisitionUnitPriceMinor: 10_000, // €100.00
    acquisitionCostsMinor: 0,
    currency: 'EUR',
    scale: 2,
    remainingQuantity: 10,
    fxProvenance: null,
    broker: null,
    ...overrides,
  };
}

const lotInput: TaxLotInput = {
  instrumentSymbol: 'AAPL',
  jurisdiction: 'AT',
  taxAssetClass: 'securities_capital_gain',
  acquisitionDate: '2025-01-01',
  acquisitionQuantity: 10,
  acquisitionUnitPrice: { minorUnits: 10_000, currency: 'EUR', scale: 2 },
  acquisitionCosts: { minorUnits: 0, currency: 'EUR', scale: 2 },
  remainingQuantity: 10,
  currency: 'EUR',
  fxProvenance: null,
  broker: null,
};

beforeEach(() => {
  createDatabaseClientMock.mockReset();
});

describe('createTaxLot', () => {
  it('reconstructs Money from integer minor units + shared currency/scale', async () => {
    const client = makeClient();
    client.query.mockResolvedValueOnce([lotRow()]);
    createDatabaseClientMock.mockReturnValue(client);

    const lot = await createTaxLot('u-1', lotInput);
    expect(lot.acquisitionUnitPrice).toEqual({ minorUnits: 10_000, currency: 'EUR', scale: 2 });
    expect(lot.remainingQuantity).toBe(10);
    // Bound minor-unit params, not floats.
    const params = client.query.mock.calls[0]![1] as unknown[];
    expect(params[6]).toBe(10_000); // acquisition_unit_price_minor
  });

  it('throws when the database is not configured', async () => {
    createDatabaseClientMock.mockReturnValue(makeClient(false));
    await expect(createTaxLot('u-1', lotInput)).rejects.toThrow(/DATABASE_URL/);
  });
});

describe('listOpenTaxLots', () => {
  it('returns [] when the database is not configured', async () => {
    createDatabaseClientMock.mockReturnValue(makeClient(false));
    expect(await listOpenTaxLots('u-1', 'AAPL')).toEqual([]);
  });

  it('maps open lots oldest-first', async () => {
    const client = makeClient();
    client.query.mockResolvedValueOnce([lotRow(), lotRow({ lotId: 'lot-2' })]);
    createDatabaseClientMock.mockReturnValue(client);
    const lots = await listOpenTaxLots('u-1', 'AAPL');
    expect(lots).toHaveLength(2);
    expect(client.query.mock.calls[0]![0]).toMatch(/order by acquisition_date asc/i);
  });
});

describe('applyLotDecrements', () => {
  it('decrements each lot atomically and no-ops on an empty list', async () => {
    const client = makeClient();
    createDatabaseClientMock.mockReturnValue(client);

    await applyLotDecrements([]);
    expect(client.transaction).not.toHaveBeenCalled();

    await applyLotDecrements([
      { lotId: 'lot-1', quantity: 4 },
      { lotId: 'lot-2', quantity: 6 },
    ]);
    expect(client.transaction).toHaveBeenCalledTimes(1);
    expect(client.execute).toHaveBeenCalledTimes(2);
    expect(client.execute.mock.calls[0]![1]).toEqual([4, 'lot-1']);
    expect(client.execute.mock.calls[1]![1]).toEqual([6, 'lot-2']);
  });
});
