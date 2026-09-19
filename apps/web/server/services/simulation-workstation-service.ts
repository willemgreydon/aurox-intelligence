import type {
  SimulationAssetScope,
  SimulationLaneId,
  SimulationLaneMode,
  SimulationSession,
} from '@repo/api-contracts';
import {
  getPreferredSimulationSessionForUser,
  getSimulationWorkspace,
  getSimulationWorkspaceIfExists,
  getUserWatchlist,
  listSimulationTradableAssets,
  markSimulationSessionOpened,
  startOrResumeSimulationSession,
} from '@repo/db';
import { requireCurrentSession } from '../auth/session';
import { loadQuoteSnapshots } from './stock-simulation-service';
import { buildSimulationActivityLanes, type SimulationActivityLane } from './simulation-activity-lanes';

type StartSessionConfigInput = {
  laneId: SimulationLaneId;
  laneMode: SimulationLaneMode;
  assetScope: SimulationAssetScope;
  maxCapitalUsd: number;
  microAllocationPercent: number;
};

export type SimulationWorkstationState = {
  session: SimulationSession | null;
  workspace: Awaited<ReturnType<typeof getSimulationWorkspaceIfExists>>;
  activityLanes: SimulationActivityLane[];
  tradableAssets: Array<{
    asset: Awaited<ReturnType<typeof listSimulationTradableAssets>>[number];
    quote: Awaited<ReturnType<typeof loadQuoteSnapshots>>[number] | null;
    isWatched: boolean;
  }>;
  watchlist: Array<{
    asset: Awaited<ReturnType<typeof listSimulationTradableAssets>>[number];
    quote: Awaited<ReturnType<typeof loadQuoteSnapshots>>[number] | null;
  }>;
  equityCurve: Array<{
    timestamp: string;
    close: number;
  }>;
  positionsByAssetClass: Array<{
    assetClass: 'stock' | 'etf' | 'crypto';
    activeCount: number;
    marketValue: number;
  }>;
  isReadOnly: boolean;
  workstationStatus: 'empty' | 'running' | 'paused' | 'degraded' | 'error' | 'failed' | 'stopped';
  statusMessage: string;
};

export type SimulationSessionTradingContext = {
  sessionId: string | null;
  laneId: SimulationLaneId | null;
  assetScope: SimulationAssetScope | null;
  isReadOnly: boolean;
  statusMessage: string;
};

const laneModeByLaneId: Record<SimulationLaneId, SimulationLaneMode> = {
  manual_stock_lane: 'manual',
  manual_multi_asset_lane: 'manual',
  ai_copilot_lane: 'ai-assisted',
  signal_follow_lane: 'strategy',
  agent_sandbox_lane: 'strategy',
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function deriveWorkstationStatus(
  session: SimulationSession | null,
): Pick<SimulationWorkstationState, 'workstationStatus' | 'statusMessage' | 'isReadOnly'> {
  if (!session) {
    return {
      workstationStatus: 'empty',
      statusMessage: 'No simulation session has been started yet. Start a lane to initialize a workstation.',
      isReadOnly: true,
    };
  }

  if (session.status === 'failed') {
    return {
      workstationStatus: 'failed',
      statusMessage: session.lastError ?? 'Session failed and requires a manual restart.',
      isReadOnly: true,
    };
  }

  if (session.observationStatus === 'error') {
    return {
      workstationStatus: 'error',
      statusMessage: session.observationMessage ?? 'Observation feed is unavailable. Trading is read-only.',
      isReadOnly: true,
    };
  }

  if (session.observationStatus === 'degraded') {
    return {
      workstationStatus: 'degraded',
      statusMessage: session.observationMessage ?? 'Observation feed is degraded. Trading is read-only until freshness recovers.',
      isReadOnly: true,
    };
  }

  if (session.status === 'running' || session.status === 'starting') {
    return {
      workstationStatus: 'running',
      statusMessage: session.observationMessage ?? 'Session is running in simulation mode.',
      isReadOnly: false,
    };
  }

  if (session.status === 'paused') {
    return {
      workstationStatus: 'paused',
      statusMessage: 'Session is paused. Resume the lane to enable trading actions.',
      isReadOnly: true,
    };
  }

  return {
    workstationStatus: 'stopped',
    statusMessage: 'Session is not currently running. Trading actions are read-only.',
    isReadOnly: true,
  };
}

export async function startSimulationSessionForCurrentUser(input: StartSessionConfigInput) {
  const auth = await requireCurrentSession('/invest');

  // Session start is the explicit mutation path that initializes account context.
  await getSimulationWorkspace(auth.user.id);

  const session = await startOrResumeSimulationSession({
    userId: auth.user.id,
    laneId: input.laneId,
    laneMode: input.laneMode,
    assetScope: input.assetScope,
    maxCapitalUsd: input.maxCapitalUsd,
    microAllocationPercent: input.microAllocationPercent,
    decisionSource: 'manual_ui',
  });

  return session;
}

export async function resolveLaneMode(laneId: SimulationLaneId): Promise<SimulationLaneMode> {
  return laneModeByLaneId[laneId];
}

export async function getSimulationWorkstationStateForCurrentUser(options?: {
  sessionId?: string | null;
  assetLimit?: number;
  watchlistLimit?: number;
  /**
   * Symbols that MUST be quoted even if they are not curated-'simulated' or on
   * the watchlist — e.g. the symbol the user is preparing a ticket for. Without
   * this, a prepared buy for a 'planned' universe symbol (e.g. COIN) has no
   * price and is wrongly blocked with "fresh quote required", even though the
   * same symbol executes fine from its detail page (which quotes it directly).
   */
  focusSymbols?: string[];
}): Promise<SimulationWorkstationState> {
  const auth = await requireCurrentSession('/invest/simulation');
  const session = await getPreferredSimulationSessionForUser(auth.user.id, options?.sessionId ?? null);
  const status = deriveWorkstationStatus(session);
  const assetScope = session?.assetScope ?? 'multi-asset';

  if (!session) {
    return {
      session: null,
      workspace: null,
      activityLanes: [],
      tradableAssets: [],
      watchlist: [],
      equityCurve: [],
      positionsByAssetClass: [],
      isReadOnly: status.isReadOnly,
      workstationStatus: status.workstationStatus,
      statusMessage: status.statusMessage,
    };
  }

  await markSimulationSessionOpened(auth.user.id, session.id);

  // Universe render cap. The prior value (140/120) arbitrarily truncated the
  // simulation universe, hiding ~200 legitimate symbols (e.g. DELL) that ARE
  // simulation-catalog assets — they were simply beyond the slice. The explorer
  // paginates client-side, so a large list is cheap to pass; the real cost is
  // quote fetches, which we bound separately below.
  const assetLimit =
    options?.assetLimit && Number.isFinite(options.assetLimit)
      ? Math.max(20, Math.floor(options.assetLimit))
      : 500;
  const watchlistLimit =
    options?.watchlistLimit && Number.isFinite(options.watchlistLimit)
      ? Math.max(10, Math.floor(options.watchlistLimit))
      : 40;

  const [tradableAssetsRaw, watchlistRaw] = await Promise.all([
    listSimulationTradableAssets(assetScope),
    getUserWatchlist(auth.user.id),
  ]);
  const tradableAssets = tradableAssetsRaw.slice(0, assetLimit);
  const watchlist = watchlistRaw.slice(0, watchlistLimit);

  // Performance / provider-budget safety (provider-call-budget-rule): only
  // fetch live quotes for assets that are actually tradable now
  // (actionAvailability === 'simulated') plus the user's watchlist. 'planned'
  // universe symbols are NOT tradable, so a fresh quote is not required for a
  // correct render — they show "unavailable" pricing and a Planned badge.
  // Quoting the full expanded universe would fire hundreds of provider calls.
  const focusSymbols = (options?.focusSymbols ?? [])
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
  const quoteCandidates = [
    ...new Set([
      ...tradableAssets
        .filter((asset) => asset.actionAvailability === 'simulated')
        .map((asset) => asset.symbol),
      ...watchlist.map((item) => item.symbol),
      // Always quote the prepared/focused symbol so its ticket has a live price,
      // regardless of curated-simulated vs planned classification.
      ...focusSymbols.filter((symbol) => tradableAssets.some((asset) => asset.symbol === symbol)),
    ]),
  ];
  const quotes = await loadQuoteSnapshots(quoteCandidates, undefined, {
    preferCached: true,
    maxSymbols: Math.max(quoteCandidates.length, 40),
  });
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));

  const workspace = await getSimulationWorkspaceIfExists(
    auth.user.id,
    Object.fromEntries(quotes.map((quote) => [quote.symbol, quote.price])),
  );

  if (!workspace) {
    return {
      session,
      workspace: null,
      activityLanes: [],
      tradableAssets: [],
      watchlist: [],
      equityCurve: [],
      positionsByAssetClass: [],
      isReadOnly: true,
      workstationStatus: 'error',
      statusMessage: 'Session exists but account context is not initialized yet. Start the session again.',
    };
  }

  const assetById = new Map(tradableAssets.map((asset) => [asset.assetId, asset]));
  const watchedAssets = watchlist
    .map((item) => assetById.get(item.assetId))
    .filter((asset): asset is (typeof tradableAssets)[number] => Boolean(asset));
  const positionsByAssetClass = (['stock', 'etf', 'crypto'] as const).map((assetClass) => {
    const rows = workspace.positions.filter((position) => position.assetClass === assetClass);
    return {
      assetClass,
      activeCount: rows.length,
      marketValue: roundCurrency(rows.reduce((sum, position) => sum + position.marketValue, 0)),
    };
  });

  return {
    session,
    workspace,
    activityLanes: buildSimulationActivityLanes(workspace),
    tradableAssets: tradableAssets.map((asset) => ({
      asset,
      quote: quoteBySymbol.get(asset.symbol) ?? null,
      isWatched: watchlist.some((item) => item.assetId === asset.assetId),
    })),
    watchlist: watchedAssets.map((asset) => ({
      asset,
      quote: quoteBySymbol.get(asset.symbol) ?? null,
    })),
    equityCurve: [...workspace.snapshots]
      .sort((left, right) => new Date(left.takenAt).getTime() - new Date(right.takenAt).getTime())
      .map((snapshot) => ({
        timestamp: snapshot.takenAt,
        close: roundCurrency(snapshot.equityValue),
      })),
    positionsByAssetClass,
    isReadOnly: status.isReadOnly,
    workstationStatus: status.workstationStatus,
    statusMessage: status.statusMessage,
  };
}

export async function assertSimulationSessionAllowsTradingForCurrentUser(sessionId?: string | null): Promise<SimulationSession> {
  const auth = await requireCurrentSession('/invest/simulation');
  const session = await getPreferredSimulationSessionForUser(auth.user.id, sessionId ?? null);
  const status = deriveWorkstationStatus(session);

  if (!session) {
    throw new Error('No simulation session is active. Start a simulation mode before placing orders.');
  }

  if (status.isReadOnly) {
    throw new Error(status.statusMessage);
  }

  return session;
}

export async function getSimulationSessionTradingContextForUser(userId: string): Promise<SimulationSessionTradingContext> {
  const session = await getPreferredSimulationSessionForUser(userId, null);
  const status = deriveWorkstationStatus(session);

  return {
    sessionId: session?.id ?? null,
    laneId: session?.laneId ?? null,
    assetScope: session?.assetScope ?? null,
    isReadOnly: status.isReadOnly,
    statusMessage: status.statusMessage,
  };
}
