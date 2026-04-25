import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeSimulationOrderForCurrentUser } from './simulation-service';

const requireCurrentSessionMock = vi.fn();
const getCatalogAssetBySymbolMock = vi.fn();
const isAssetSimulationTradableMock = vi.fn();
const getSimulationWorkspaceMock = vi.fn();
const loadQuoteSnapshotsMock = vi.fn();
const executeSimulationOrderMock = vi.fn();

vi.mock('../auth/session', () => ({
  requireCurrentSession: (...args: unknown[]) => requireCurrentSessionMock(...args),
}));

vi.mock('@repo/db', () => ({
  getCatalogAssetBySymbol: (...args: unknown[]) => getCatalogAssetBySymbolMock(...args),
  isAssetSimulationTradable: (...args: unknown[]) => isAssetSimulationTradableMock(...args),
  getSimulationWorkspace: (...args: unknown[]) => getSimulationWorkspaceMock(...args),
  executeSimulationOrder: (...args: unknown[]) => executeSimulationOrderMock(...args),
  listSimulationTradableAssets: vi.fn(),
}));

vi.mock('./stock-simulation-service', () => ({
  SIMULATION_QUOTE_MAX_AGE_MS: 15 * 60 * 1000,
  isFreshQuoteTimestampForSimulation: (timestamp: string | null | undefined) => {
    if (!timestamp) return false;
    return Date.now() - new Date(timestamp).getTime() <= 15 * 60 * 1000;
  },
  loadQuoteSnapshots: (...args: unknown[]) => loadQuoteSnapshotsMock(...args),
}));

function mockHappyPath(assetClass: 'stock' | 'etf' | 'crypto') {
  requireCurrentSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
  getCatalogAssetBySymbolMock.mockResolvedValue({
    assetId: `${assetClass}-1`,
    symbol: 'SPY',
    assetClass,
    isSimulated: true,
    isTradable: true,
    actionAvailability: 'simulated',
  });
  isAssetSimulationTradableMock.mockReturnValue(true);
  getSimulationWorkspaceMock.mockResolvedValue({
    summary: { availableCash: 100000 },
    positions: [{ assetId: `${assetClass}-1`, quantity: 10, averageCost: 100 }],
  });
  loadQuoteSnapshotsMock.mockResolvedValue([
    {
      symbol: 'SPY',
      price: 101,
      observedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
    },
  ]);
  executeSimulationOrderMock.mockResolvedValue({ id: 'order-1' });
}

describe('executeSimulationOrderForCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes ETF buy orders in simulation mode', async () => {
    mockHappyPath('etf');

    await executeSimulationOrderForCurrentUser({
      assetId: 'etf-1',
      symbol: 'SPY',
      assetClass: 'etf',
      side: 'buy',
      quantity: 1,
      strategyLaneId: 'manual_multi_asset_lane',
      sessionAssetScope: 'multi-asset',
    });

    expect(executeSimulationOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ assetClass: 'etf', side: 'buy' }),
    );
  });

  it('executes ETF sell orders in simulation mode', async () => {
    mockHappyPath('etf');

    await executeSimulationOrderForCurrentUser({
      assetId: 'etf-1',
      symbol: 'SPY',
      assetClass: 'etf',
      side: 'sell',
      quantity: 1,
      strategyLaneId: 'manual_multi_asset_lane',
      sessionAssetScope: 'multi-asset',
    });

    expect(executeSimulationOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ assetClass: 'etf', side: 'sell' }),
    );
  });

  it('executes crypto buy orders in simulation mode', async () => {
    mockHappyPath('crypto');
    getCatalogAssetBySymbolMock.mockResolvedValue({
      assetId: 'crypto-1',
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      isSimulated: true,
      isTradable: true,
      actionAvailability: 'simulated',
    });
    loadQuoteSnapshotsMock.mockResolvedValue([
      {
        symbol: 'BINANCE:BTCUSDT',
        price: 62000,
        observedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
      },
    ]);

    await executeSimulationOrderForCurrentUser({
      assetId: 'crypto-1',
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      side: 'buy',
      quantity: 0.01,
      strategyLaneId: 'manual_multi_asset_lane',
      sessionAssetScope: 'multi-asset',
    });

    expect(executeSimulationOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ assetClass: 'crypto', side: 'buy' }),
    );
  });

  it('executes crypto sell orders in simulation mode', async () => {
    mockHappyPath('crypto');
    getCatalogAssetBySymbolMock.mockResolvedValue({
      assetId: 'crypto-1',
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      isSimulated: true,
      isTradable: true,
      actionAvailability: 'simulated',
    });
    getSimulationWorkspaceMock.mockResolvedValue({
      summary: { availableCash: 100000 },
      positions: [{ assetId: 'crypto-1', quantity: 0.5, averageCost: 55000 }],
    });
    loadQuoteSnapshotsMock.mockResolvedValue([
      {
        symbol: 'BINANCE:BTCUSDT',
        price: 62000,
        observedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
      },
    ]);

    await executeSimulationOrderForCurrentUser({
      assetId: 'crypto-1',
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      side: 'sell',
      quantity: 0.01,
      strategyLaneId: 'manual_multi_asset_lane',
      sessionAssetScope: 'multi-asset',
    });

    expect(executeSimulationOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ assetClass: 'crypto', side: 'sell' }),
    );
  });

  it('rejects unsupported assets', async () => {
    requireCurrentSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
    getCatalogAssetBySymbolMock.mockResolvedValue(null);

    await expect(
      executeSimulationOrderForCurrentUser({
        assetId: 'x-1',
        symbol: 'X',
        assetClass: 'etf',
        side: 'buy',
        quantity: 1,
      }),
    ).rejects.toThrow('not enabled for simulation trading');
  });

  it('rejects stale or missing quotes', async () => {
    mockHappyPath('etf');
    loadQuoteSnapshotsMock.mockResolvedValue([
      {
        symbol: 'SPY',
        price: 101,
        observedAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
        fetchedAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
      },
    ]);

    await expect(
      executeSimulationOrderForCurrentUser({
        assetId: 'etf-1',
        symbol: 'SPY',
        assetClass: 'etf',
        side: 'buy',
        quantity: 1,
        strategyLaneId: 'manual_multi_asset_lane',
      }),
    ).rejects.toThrow('fresh quote is required');
  });

  it('rejects wrong lane scope for multi-asset orders', async () => {
    mockHappyPath('etf');

    await expect(
      executeSimulationOrderForCurrentUser({
        assetId: 'etf-1',
        symbol: 'SPY',
        assetClass: 'etf',
        side: 'buy',
        quantity: 1,
        strategyLaneId: 'manual_multi_asset_lane',
        sessionAssetScope: 'stock',
      }),
    ).rejects.toThrow('active session only allows STOCK orders');
  });
});
