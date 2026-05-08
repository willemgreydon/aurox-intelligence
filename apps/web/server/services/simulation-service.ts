import type { MicroTradingGuardrails, SimulationAssetClass } from '@repo/api-contracts';
import {
  executeSimulationOrder,
  getCatalogAssetBySymbol,
  getSimulationWorkspace,
  isAssetSimulationTradable,
  listSimulationTradableAssets,
} from '@repo/db';
import { requireCurrentSession } from '../auth/session';
import { loadQuoteSnapshots } from './stock-simulation-service';
import { isPrismaDbEnabled } from '../lib/db-runtime';

const SIMULATION_QUOTE_MAX_AGE_MS = 15 * 60 * 1000;

type SimulationWorkspaceViewModel = Awaited<ReturnType<typeof getSimulationWorkspace>> & {
  investableAssets: Array<{
    assetId: string;
    symbol: string;
    name: string;
    assetClass: SimulationAssetClass;
    category: string;
    thesis: string;
    riskSummary: string;
    price: number | null;
    changePercent: number | null;
    lastUpdatedAt: string | null;
  }>;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number) {
  return value.toFixed(4);
}

function isFreshQuoteTimestampForSimulation(timestamp: string | null | undefined) {
  if (!timestamp) {
    return false;
  }

  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) {
    return false;
  }

  return Date.now() - parsed <= SIMULATION_QUOTE_MAX_AGE_MS;
}

export function getMicroTradingGuardrailsForDisplay(): MicroTradingGuardrails {
  const enabled = String(process.env.FEATURE_SIM_MICRO_TRADING ?? 'false').toLowerCase() === 'true';
  return {
    enabled,
    simulationOnly: true,
    minimumSimulatedOrderNotional: 10,
    maxDailySimulatedTrades: 12,
    minConfidenceThreshold: 0.7,
    maxSpreadBpsThreshold: 35,
    maxVolatilityThreshold: 0.08,
    estimatedFeeImpactBps: 12,
    estimatedSpreadImpactBps: 8,
    estimatedSlippageImpactBps: 10,
    inefficiencyExplanation: [
      'Tiny orders can be disproportionately impacted by fees.',
      'Wide spreads can erase expected edge on micro notional.',
      'Frequent micro orders increase operational and execution risk.',
    ],
    highFrequencyRiskWarning: 'High-frequency micro-ordering can increase drawdown and execution drag.',
  };
}

export async function getSimulationWorkspaceData(): Promise<SimulationWorkspaceViewModel> {
  const session = await requireCurrentSession('/invest/simulation');
  const workspace = await getSimulationWorkspace(session.user.id);
  const universe = await listSimulationTradableAssets('multi-asset');

  const symbolSet = new Set<string>([
    ...workspace.positions.map((position) => position.symbol),
    ...universe.map((asset) => asset.symbol),
  ]);

  const observations = symbolSet.size ? await loadQuoteSnapshots([...symbolSet]).catch(() => []) : [];
  const priceMap = new Map(observations.map((item) => [item.symbol, item]));
  const positions = workspace.positions.map((position) => {
    const observation = priceMap.get(position.symbol);
    const marketPrice = observation?.price ?? null;
    const marketValue = roundCurrency(position.quantity * (marketPrice ?? position.averageCost));
    const unrealizedPnl = roundCurrency(marketValue - position.costBasis);

    return {
      ...position,
      marketPrice,
      marketValue,
      unrealizedPnl,
    };
  });

  const portfolioValue = roundCurrency(positions.reduce((sum, position) => sum + position.marketValue, 0));
  const unrealizedPnl = roundCurrency(positions.reduce((sum, position) => sum + position.unrealizedPnl, 0));

  return {
    ...workspace,
    summary: {
      ...workspace.summary,
      portfolioValue,
      equityValue: roundCurrency(workspace.summary.cashBalance + portfolioValue),
      unrealizedPnl,
    },
    positions,
    investableAssets: universe.map((asset) => {
      const observation = priceMap.get(asset.symbol);
      return {
        assetId: asset.assetId,
        symbol: asset.symbol,
        name: asset.name,
        assetClass: asset.assetClass,
        category: asset.category,
        thesis: asset.thesis,
        riskSummary: asset.riskSummary,
        price: observation?.price ?? null,
        changePercent: observation?.changePercent ?? null,
        lastUpdatedAt: observation?.observedAt ?? null,
      };
    }),
  };
}

export async function executeSimulationOrderForCurrentUser(input: {
  assetId: string;
  symbol: string;
  assetClass: SimulationAssetClass;
  side: 'buy' | 'sell';
  quantity: number;
  strategyLaneId?:
    | 'manual_stock_lane'
    | 'manual_multi_asset_lane'
    | 'ai_copilot_lane'
    | 'signal_follow_lane'
    | 'agent_sandbox_lane';
  sessionAssetScope?: 'stock' | 'etf' | 'crypto' | 'multi-asset';
  notes?: string;
  idempotencyKey?: string;
}) {
  if (!isPrismaDbEnabled()) {
    throw new Error('Simulation database is currently unavailable.');
  }

  const session = await requireCurrentSession('/invest/simulation');
  const normalizedSymbol = input.symbol.trim().toUpperCase();
  const asset = await getCatalogAssetBySymbol(normalizedSymbol);

  if (!asset || !isAssetSimulationTradable(asset)) {
    throw new Error('This asset is not enabled for simulation trading in the current catalog configuration.');
  }

  if (asset.assetClass !== input.assetClass) {
    throw new Error('Asset class mismatch detected. Refresh the workstation and submit the order again.');
  }

  if (asset.assetId !== input.assetId || asset.symbol !== normalizedSymbol) {
    throw new Error('Asset metadata mismatch detected. Refresh the workstation and submit the order again.');
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Order quantity must be greater than zero.');
  }

  if (input.strategyLaneId === 'manual_stock_lane' && input.assetClass !== 'stock') {
    throw new Error('The manual stock lane only supports stock orders.');
  }

  if (input.sessionAssetScope && input.sessionAssetScope !== 'multi-asset' && input.sessionAssetScope !== input.assetClass) {
    throw new Error(`The active session only allows ${input.sessionAssetScope.toUpperCase()} orders.`);
  }

  const workspace = await getSimulationWorkspace(session.user.id);
  const activePosition = workspace.positions.find((position) => position.assetId === asset.assetId) ?? null;

  if (input.side === 'sell') {
    if (!activePosition || activePosition.quantity <= 0) {
      throw new Error(`No open ${asset.symbol} position is available to sell.`);
    }

    if (activePosition.quantity + 1e-8 < input.quantity) {
      throw new Error(`Sell quantity exceeds the current open ${asset.symbol} quantity. Held: ${formatQuantity(activePosition.quantity)}.`);
    }
  }

  const [observation] = await loadQuoteSnapshots([asset.symbol]);

  if (typeof observation?.price !== 'number' || !Number.isFinite(observation.price) || observation.price <= 0) {
    throw new Error(`Unable to price ${asset.symbol} for simulation right now.`);
  }

  const quoteTimestamp = observation.observedAt ?? observation.fetchedAt ?? null;
  if (!isFreshQuoteTimestampForSimulation(quoteTimestamp)) {
    throw new Error(`Unable to execute ${asset.symbol} safely: a fresh quote is required for simulation trading.`);
  }

  const grossAmount = roundCurrency(input.quantity * observation.price);

  if (input.side === 'buy' && workspace.summary.availableCash + 1e-8 < grossAmount) {
    throw new Error(`Insufficient available simulation cash. Required: ${formatUsd(grossAmount)}. Available: ${formatUsd(workspace.summary.availableCash)}.`);
  }

  return executeSimulationOrder({
    userId: session.user.id,
    assetId: asset.assetId,
    symbol: asset.symbol,
    assetClass: asset.assetClass,
    side: input.side,
    quantity: input.quantity,
    executionPrice: observation.price,
    requestedPrice: observation.price,
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    executionModel: {
      feeBps: input.assetClass === 'crypto' ? 12 : 3,
      slippageBps: input.assetClass === 'crypto' ? 15 : 4,
      latencyMs: input.assetClass === 'crypto' ? 220 : 90,
      venue: 'simulation_engine',
    },
  });
}
