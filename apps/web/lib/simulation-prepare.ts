import type { SimulationAssetClass, SimulationLaneId } from '@repo/api-contracts';

export type PreparedSimulationTicket = {
  intent: 'prepare';
  side: 'buy' | 'sell';
  symbol: string;
  assetClass: SimulationAssetClass;
  lane: SimulationLaneId;
  source: string;
};

function normalizeLane(value: string | null | undefined): SimulationLaneId | null {
  if (
    value === 'manual_stock_lane' ||
    value === 'manual_multi_asset_lane' ||
    value === 'ai_copilot_lane' ||
    value === 'signal_follow_lane' ||
    value === 'agent_sandbox_lane'
  ) {
    return value;
  }
  return null;
}

function normalizeAssetClass(value: string | null | undefined): SimulationAssetClass | null {
  if (value === 'stock' || value === 'etf' || value === 'crypto') {
    return value;
  }
  return null;
}

export function parsePreparedSimulationTicket(input: Record<string, string | undefined>): PreparedSimulationTicket | null {
  const intent = input.intent?.toLowerCase();
  if (intent !== 'prepare') {
    return null;
  }

  const sideRaw = input.side?.toLowerCase();
  if (sideRaw !== 'buy' && sideRaw !== 'sell') {
    return null;
  }

  const symbol = input.symbol?.trim().toUpperCase();
  if (!symbol) {
    return null;
  }

  const assetClass = normalizeAssetClass(input.assetClass?.toLowerCase());
  if (!assetClass) {
    return null;
  }

  const lane = normalizeLane(input.lane);
  if (!lane) {
    return null;
  }

  return {
    intent: 'prepare',
    side: sideRaw,
    symbol,
    assetClass,
    lane,
    source: input.source?.trim() || 'simulation',
  };
}

