import { describe, expect, it, vi } from 'vitest';
import { isAssetSimulationTradable, listSimulationTradableAssets } from './asset-repository';

// Force the DB-absence path so the test is deterministic against the canonical
// fallback investment universe (no live DB required).
const createDatabaseClientMock = vi.fn();

vi.mock('../client', () => ({
  createDatabaseClient: () => createDatabaseClientMock(),
}));

createDatabaseClientMock.mockReturnValue({
  isConfigured: false,
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
});

describe('simulation tradable universe', () => {
  it('includes DELL as a simulation-catalog asset (regression: was truncated by the 120 cap)', async () => {
    const assets = await listSimulationTradableAssets();
    const dell = assets.find((asset) => asset.symbol === 'DELL');

    // DELL must be present via normal eligibility rules — not a special case.
    expect(dell).toBeDefined();
    expect(dell?.assetClass).toBe('stock');
  });

  it('keeps DELL non-buyable: it is Planned, not simulation-tradable now', async () => {
    const assets = await listSimulationTradableAssets();
    const dell = assets.find((asset) => asset.symbol === 'DELL');

    // Financial-safety invariant: an expanded-coverage symbol must surface as
    // 'planned' (observation only), never silently as an executable asset.
    expect(dell?.actionAvailability).toBe('planned');
  });

  it('promotes COIN to a first-class simulated tradable asset', async () => {
    const assets = await listSimulationTradableAssets();
    const coin = assets.find((asset) => asset.symbol === 'COIN');
    expect(coin).toBeDefined();
    // COIN is promoted from the expanded universe to simulated (quoted + buyable).
    expect(coin?.actionAvailability).toBe('simulated');
  });

  it('exposes far more than the old 120-item cap (root cause was an arbitrary slice)', async () => {
    const assets = await listSimulationTradableAssets();
    // The previous 120-slice truncated a universe an order of magnitude larger.
    expect(assets.length).toBeGreaterThan(120);
  });

  it('isAssetSimulationTradable admits a Planned stock but excludes unavailable assets', () => {
    expect(
      isAssetSimulationTradable({
        assetClass: 'stock',
        isSimulated: true,
        isTradable: true,
        actionAvailability: 'planned',
      }),
    ).toBe(true);

    expect(
      isAssetSimulationTradable({
        assetClass: 'stock',
        isSimulated: true,
        isTradable: true,
        actionAvailability: 'unavailable',
      }),
    ).toBe(false);
  });
});
