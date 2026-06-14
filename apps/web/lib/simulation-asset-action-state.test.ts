import { describe, expect, it } from 'vitest';
import { getSimulationAssetActionState } from './simulation-asset-action-state';

describe('getSimulationAssetActionState', () => {
  it('MSFT with an open position → sell enabled', () => {
    const state = getSimulationAssetActionState({
      isAuthenticated: true,
      actionAvailability: 'simulated',
      hasOpenPosition: true,
    });
    expect(state.canPrepareSell).toBe(true);
    expect(state.sellDisabledCode).toBeNull();
    expect(state.canPrepareBuy).toBe(true);
  });

  it('AMD with an open position → sell enabled', () => {
    const state = getSimulationAssetActionState({
      isAuthenticated: true,
      actionAvailability: 'available',
      hasOpenPosition: true,
    });
    expect(state.canPrepareSell).toBe(true);
  });

  it('AAPL closed (no open position) → sell disabled with no_open_position, buy still allowed', () => {
    const state = getSimulationAssetActionState({
      isAuthenticated: true,
      actionAvailability: 'simulated',
      hasOpenPosition: false,
    });
    expect(state.canPrepareSell).toBe(false);
    expect(state.sellDisabledCode).toBe('no_open_position');
    expect(state.canPrepareBuy).toBe(true);
  });

  it('META not held → sell disabled (quiet) and buy enabled', () => {
    const state = getSimulationAssetActionState({
      isAuthenticated: true,
      hasOpenPosition: false,
    });
    expect(state.canPrepareSell).toBe(false);
    expect(state.sellDisabledCode).toBe('no_open_position');
  });

  it('planned asset → buy disabled with support reason, no position → sell disabled with no_open_position', () => {
    const state = getSimulationAssetActionState({
      isAuthenticated: true,
      actionAvailability: 'planned',
      hasOpenPosition: false,
    });
    expect(state.canPrepareBuy).toBe(false);
    expect(state.buyDisabledCode).toBe('asset_planned');
    expect(state.canPrepareSell).toBe(false);
    expect(state.sellDisabledCode).toBe('no_open_position');
  });

  it('unavailable asset → buy disabled with asset_unavailable', () => {
    const state = getSimulationAssetActionState({
      isAuthenticated: true,
      actionAvailability: 'unavailable',
      hasOpenPosition: false,
    });
    expect(state.canPrepareBuy).toBe(false);
    expect(state.buyDisabledCode).toBe('asset_unavailable');
  });

  it('open position on a planned asset can still be sold (exit path never blocked)', () => {
    const state = getSimulationAssetActionState({
      isAuthenticated: true,
      actionAvailability: 'planned',
      hasOpenPosition: true,
    });
    expect(state.canPrepareSell).toBe(true);
    expect(state.canPrepareBuy).toBe(false); // can't add to a planned asset
  });

  it('read-only session disables both sides regardless of holdings', () => {
    const state = getSimulationAssetActionState({
      isAuthenticated: true,
      isReadOnly: true,
      actionAvailability: 'simulated',
      hasOpenPosition: true,
    });
    expect(state.canPrepareBuy).toBe(false);
    expect(state.buyDisabledCode).toBe('read_only');
    expect(state.canPrepareSell).toBe(false);
    expect(state.sellDisabledCode).toBe('read_only');
  });

  it('unauthenticated → nothing tradable, inspect still allowed', () => {
    const state = getSimulationAssetActionState({
      isAuthenticated: false,
      hasOpenPosition: true,
    });
    expect(state.canInspect).toBe(true);
    expect(state.canPrepareBuy).toBe(false);
    expect(state.canPrepareSell).toBe(false);
    expect(state.buyDisabledCode).toBe('not_authenticated');
  });

  it('upstream quote block disables buy and held-sell with quote_unusable', () => {
    const state = getSimulationAssetActionState({
      isAuthenticated: true,
      actionAvailability: 'simulated',
      hasOpenPosition: true,
      hasUpstreamBlock: true,
    });
    expect(state.buyDisabledCode).toBe('quote_unusable');
    expect(state.sellDisabledCode).toBe('quote_unusable');
  });

  it('live trading stays locked — helper only governs simulation prepare actions (smoke)', () => {
    // Sanity: no field in the result ever enables a live path; it is purely
    // about prepare-buy / prepare-sell availability.
    const state = getSimulationAssetActionState({ isAuthenticated: true, hasOpenPosition: true });
    expect(Object.keys(state).sort()).toEqual(
      ['buyDisabledCode', 'canInspect', 'canPrepareBuy', 'canPrepareSell', 'sellDisabledCode'].sort(),
    );
  });
});
