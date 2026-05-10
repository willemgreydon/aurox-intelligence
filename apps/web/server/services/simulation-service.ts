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
import { evaluateSimulationQuoteUsability } from './simulation-quote-usability';

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

type SimulationRiskGuardConfig = {
  maxNotionalPerTradeUsd: number;
  maxDailyNotionalUsd: number;
  maxOpenExposureUsd: number;
  maxPerAssetExposureUsd: number;
  blockOnStaleQuote: boolean;
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

function freshQuoteRequiredMessage(symbol: string) {
  return `Simulation quote is not ready yet. (${symbol})`;
}

function getRiskGuardConfig(): SimulationRiskGuardConfig {
  return {
    maxNotionalPerTradeUsd: Number(process.env.SIM_MAX_NOTIONAL_PER_TRADE_USD ?? 25_000),
    maxDailyNotionalUsd: Number(process.env.SIM_MAX_DAILY_NOTIONAL_USD ?? 100_000),
    maxOpenExposureUsd: Number(process.env.SIM_MAX_OPEN_EXPOSURE_USD ?? 250_000),
    maxPerAssetExposureUsd: Number(process.env.SIM_MAX_PER_ASSET_EXPOSURE_USD ?? 75_000),
    blockOnStaleQuote: String(process.env.SIM_BLOCK_ON_STALE_QUOTE ?? 'true').toLowerCase() !== 'false',
  };
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
  macroRegimeSnapshot?: string | null;
  providerSnapshot?: string | null;
  freshnessState?: string | null;
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
  const quoteUsability = evaluateSimulationQuoteUsability({
    symbol: asset.symbol,
    assetClass: input.assetClass,
    quote: observation,
  });
  if (process.env.NODE_ENV !== 'production') {
    console.info('[simulation] quote candidate', {
      symbol: asset.symbol,
      assetClass: input.assetClass,
      price: observation?.price ?? null,
      provider: observation?.source ?? null,
      freshnessState: quoteUsability.freshnessState ?? null,
      quoteMode: null,
      updatedAt: null,
      observedAt: observation?.observedAt ?? null,
      receivedAt: null,
      marketSessionState: quoteUsability.marketSessionState ?? 'unknown',
    });
  }

  if (!quoteUsability.usable || quoteUsability.price === null) {
    throw new Error(freshQuoteRequiredMessage(asset.symbol));
  }
  const guard = getRiskGuardConfig();
  if (guard.blockOnStaleQuote && quoteUsability.reasonCode === 'STALE_DURING_MARKET_HOURS') {
    throw new Error(freshQuoteRequiredMessage(asset.symbol));
  }

  const grossAmount = roundCurrency(input.quantity * quoteUsability.price);
  if (grossAmount > guard.maxNotionalPerTradeUsd) {
    throw new Error(`Order notional exceeds per-trade cap (${formatUsd(guard.maxNotionalPerTradeUsd)}).`);
  }

  if (input.side === 'buy' && workspace.summary.availableCash + 1e-8 < grossAmount) {
    throw new Error(`Insufficient available simulation cash. Required: ${formatUsd(grossAmount)}. Available: ${formatUsd(workspace.summary.availableCash)}.`);
  }
  const positionByAsset = workspace.positions.find((position) => position.assetId === asset.assetId) ?? null;
  const currentAssetExposure = positionByAsset ? roundCurrency(positionByAsset.quantity * (quoteUsability.price || positionByAsset.averageCost)) : 0;
  const nextAssetExposure = input.side === 'buy'
    ? currentAssetExposure + grossAmount
    : Math.max(0, currentAssetExposure - grossAmount);
  if (nextAssetExposure > guard.maxPerAssetExposureUsd) {
    throw new Error(`Asset exposure cap exceeded (${formatUsd(guard.maxPerAssetExposureUsd)}).`);
  }
  const openExposure = workspace.summary.portfolioValue ?? 0;
  const nextExposure = input.side === 'buy'
    ? openExposure + grossAmount
    : Math.max(0, openExposure - grossAmount);
  if (nextExposure > guard.maxOpenExposureUsd) {
    throw new Error(`Open exposure cap exceeded (${formatUsd(guard.maxOpenExposureUsd)}).`);
  }
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const dailyNotional = (workspace.orders ?? [])
    .filter((order) => new Date(order.executedAt).getTime() >= startOfDay.getTime())
    .reduce((sum, order) => sum + Math.abs(order.grossAmount), 0);
  if (dailyNotional + grossAmount > guard.maxDailyNotionalUsd) {
    throw new Error(`Daily notional cap exceeded (${formatUsd(guard.maxDailyNotionalUsd)}).`);
  }

  const noteParts = [
    input.notes ?? null,
    input.macroRegimeSnapshot ? `macro=${input.macroRegimeSnapshot}` : null,
    input.providerSnapshot ? `provider=${input.providerSnapshot}` : null,
    input.freshnessState ? `freshness=${input.freshnessState}` : null,
    quoteUsability.warning ? `quote_warning=${quoteUsability.warning}` : null,
    quoteUsability.quoteAgeSeconds !== undefined ? `quote_age_seconds=${quoteUsability.quoteAgeSeconds}` : null,
    quoteUsability.marketSessionState ? `market_session=${quoteUsability.marketSessionState}` : null,
  ].filter((item): item is string => Boolean(item));

  return executeSimulationOrder({
    userId: session.user.id,
    assetId: asset.assetId,
    symbol: asset.symbol,
    assetClass: asset.assetClass,
    side: input.side,
    quantity: input.quantity,
    executionPrice: quoteUsability.price,
    requestedPrice: quoteUsability.price,
    ...(noteParts.length > 0 ? { notes: noteParts.join(';') } : {}),
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    executionModel: {
      feeBps: input.assetClass === 'crypto' ? 12 : 3,
      slippageBps: input.assetClass === 'crypto' ? 15 : 4,
      latencyMs: input.assetClass === 'crypto' ? 220 : 90,
      venue: 'simulation_engine',
    },
  });
}
