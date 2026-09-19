import type {
  SimulationAssetScope,
  SimulationLaneId,
  SimulationLaneMode,
  SimulationSessionStatus,
} from '@repo/api-contracts';
import {
  getSimulationWorkspaceIfExists,
  listSimulationSessionsForUser,
} from '@repo/db';
import { requireCurrentSession } from '../auth/session';
import {
  getSimulationLaneDefinition,
  perOrderMicroAllocationUsd,
  type SimulationLaneAssetScope,
  type SimulationLaneStatus,
} from '../../lib/simulation-lane-catalog';
import { buildSimulationActivityLanes, parseLaneIdFromOrderNotes } from './simulation-activity-lanes';

export type SimulationLaneOrderRow = {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  executedPrice: number;
  realizedPnl: number;
  executedAt: string;
  assetClass: 'stock' | 'etf' | 'crypto';
};

export type SimulationLaneDetailViewModel = {
  laneId: SimulationLaneId;
  label: string;
  mode: SimulationLaneMode;
  status: SimulationLaneStatus;
  description: string;
  supportNote: string;
  assetScopeOptions: SimulationLaneAssetScope[];

  hasSession: boolean;
  session: {
    id: string;
    status: SimulationSessionStatus;
    assetScope: SimulationAssetScope;
    maxCapitalUsd: number;
    microAllocationPercent: number;
    /** Per-order allocation cap in USD (config only, not enforced at execution). */
    perOrderMicroAllocationUsd: number;
    decisionSource: string;
    observationStatus: string;
    observationMessage: string | null;
    createdAt: string;
    startedAt: string | null;
    lastActivityAt: string | null;
    lastError: string | null;
  } | null;

  /**
   * Capital numbers are PORTFOLIO-SCOPED (the simulation account is shared across
   * lanes; positions/orders are not attributed per-lane in the schema). The UI
   * must label these as account-wide, not lane-isolated.
   */
  capital: {
    capitalLimit: number;
    allocatedCapital: number;
    availableCapital: number;
    portfolioScoped: true;
  } | null;

  /** Orders whose notes are tagged with this lane id (auditable lane attribution). */
  laneOrders: SimulationLaneOrderRow[];
  laneOrderCount: number;

  /** Invariant: this surface is simulation-only and read-only. */
  isSimulationOnly: true;
  isReadOnly: true;
};

/**
 * Read-only lane detail assembled entirely from real persisted state (lane
 * catalog + the user's simulation session + workspace). No fabricated per-lane
 * metrics and no execution controls — lanes are configuration wrappers, so the
 * detail view is inspection-only. Returns null for an unknown lane id (the route
 * maps that to notFound).
 */
export async function getSimulationLaneDetailForCurrentUser(
  laneId: SimulationLaneId,
): Promise<SimulationLaneDetailViewModel | null> {
  const definition = getSimulationLaneDefinition(laneId);
  if (!definition) {
    return null;
  }

  const auth = await requireCurrentSession('/invest/simulation');

  const [sessions, workspace] = await Promise.all([
    listSimulationSessionsForUser(auth.user.id),
    // Cost-basis valuation (empty price map) — avoids provider calls for a
    // read-only inspection surface. Numbers are account-wide, not lane-isolated.
    getSimulationWorkspaceIfExists(auth.user.id, {}),
  ]);

  // Most-recently-updated session for this lane, if the user ever ran it.
  const laneSession =
    sessions
      .filter((session) => session.laneId === laneId)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] ?? null;

  const activityLane = workspace
    ? buildSimulationActivityLanes(workspace).find((lane) => lane.laneId === laneId) ?? null
    : null;

  const laneOrders: SimulationLaneOrderRow[] = workspace
    ? workspace.orders
        .filter((order) => parseLaneIdFromOrderNotes(order.notes) === laneId)
        .slice(0, 25)
        .map((order) => ({
          id: order.id,
          symbol: order.symbol,
          side: order.side,
          quantity: order.quantity,
          executedPrice: order.executedPrice,
          realizedPnl: order.realizedPnl,
          executedAt: order.executedAt,
          assetClass: order.assetClass,
        }))
    : [];

  const capital =
    activityLane != null
      ? {
          capitalLimit: laneSession?.maxCapitalUsd ?? activityLane.capitalLimit,
          allocatedCapital: activityLane.allocatedCapital,
          availableCapital: activityLane.availableCapital,
          portfolioScoped: true as const,
        }
      : null;

  return {
    laneId,
    label: definition.label,
    mode: definition.mode,
    status: definition.status,
    description: definition.description,
    supportNote: definition.supportNote,
    assetScopeOptions: definition.assetScopeOptions,

    hasSession: laneSession != null,
    session: laneSession
      ? {
          id: laneSession.id,
          status: laneSession.status,
          assetScope: laneSession.assetScope,
          maxCapitalUsd: laneSession.maxCapitalUsd,
          microAllocationPercent: laneSession.microAllocationPercent,
          perOrderMicroAllocationUsd: perOrderMicroAllocationUsd(
            laneSession.maxCapitalUsd,
            laneSession.microAllocationPercent,
          ),
          decisionSource: laneSession.decisionSource,
          observationStatus: laneSession.observationStatus,
          observationMessage: laneSession.observationMessage,
          createdAt: laneSession.createdAt,
          startedAt: laneSession.startedAt,
          lastActivityAt:
            laneSession.lastHeartbeatAt ?? laneSession.lastOpenedAt ?? laneSession.updatedAt,
          lastError: laneSession.lastError,
        }
      : null,

    capital,
    laneOrders,
    laneOrderCount: laneOrders.length,
    isSimulationOnly: true,
    isReadOnly: true,
  };
}
