/**
 * Central, deterministic decision for which simulation actions an asset card may
 * expose, and why an action is disabled. Pure function — single source of truth
 * shared by `QuickTradeActions` and any other surface, so gating cannot drift
 * between card variants.
 *
 * Risk-correct rules:
 *  - Live trading stays locked here; this only governs *simulation* prepare actions.
 *  - PLANNED / UNAVAILABLE assets do not expose an enabled Buy.
 *  - An OPEN position can always be prepared for sale (the exit path is never
 *    blocked by a later availability downgrade). Selling what you don't hold is
 *    disabled, quietly (no loud per-card message).
 */

export type SimulationActionAvailability = 'available' | 'simulated' | 'planned' | 'unavailable';

export type SimulationActionDisabledCode =
  | 'not_authenticated'
  | 'read_only'
  | 'asset_planned'
  | 'asset_unavailable'
  | 'quote_unusable'
  | 'no_open_position';

export type SimulationAssetActionState = {
  canInspect: boolean;
  canPrepareBuy: boolean;
  canPrepareSell: boolean;
  buyDisabledCode: SimulationActionDisabledCode | null;
  sellDisabledCode: SimulationActionDisabledCode | null;
};

export type SimulationAssetActionInput = {
  isAuthenticated: boolean;
  /** Session-level read-only (e.g. workstation halted / not writable). */
  isReadOnly?: boolean;
  actionAvailability?: SimulationActionAvailability;
  /** True when the user holds an open simulated position (quantity > 0). */
  hasOpenPosition?: boolean;
  /**
   * True when an upstream check (stale/missing quote, fresh-quote-required)
   * already determined the trade cannot be prepared. Carried through as
   * `quote_unusable` for both sides.
   */
  hasUpstreamBlock?: boolean;
};

export function getSimulationAssetActionState(
  input: SimulationAssetActionInput,
): SimulationAssetActionState {
  const availability = input.actionAvailability ?? 'simulated';
  const isReadOnly = input.isReadOnly ?? false;
  const hasOpenPosition = input.hasOpenPosition ?? false;
  const hasUpstreamBlock = input.hasUpstreamBlock ?? false;

  // Inspect is always allowed — it never moves capital.
  const canInspect = true;

  if (!input.isAuthenticated) {
    return {
      canInspect,
      canPrepareBuy: false,
      canPrepareSell: false,
      buyDisabledCode: 'not_authenticated',
      sellDisabledCode: 'not_authenticated',
    };
  }

  // Buy gating (highest-priority reason first).
  let buyDisabledCode: SimulationActionDisabledCode | null = null;
  if (isReadOnly) buyDisabledCode = 'read_only';
  else if (availability === 'unavailable') buyDisabledCode = 'asset_unavailable';
  else if (availability === 'planned') buyDisabledCode = 'asset_planned';
  else if (hasUpstreamBlock) buyDisabledCode = 'quote_unusable';

  // Sell gating: an open position must always be exitable, so availability does
  // NOT block selling. Order: read-only → no position → upstream quote block.
  let sellDisabledCode: SimulationActionDisabledCode | null = null;
  if (isReadOnly) sellDisabledCode = 'read_only';
  else if (!hasOpenPosition) sellDisabledCode = 'no_open_position';
  else if (hasUpstreamBlock) sellDisabledCode = 'quote_unusable';

  return {
    canInspect,
    canPrepareBuy: buyDisabledCode === null,
    canPrepareSell: sellDisabledCode === null,
    buyDisabledCode,
    sellDisabledCode,
  };
}
