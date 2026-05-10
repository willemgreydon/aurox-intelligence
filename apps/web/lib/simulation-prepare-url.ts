import type { SimulationAssetClass, SimulationLaneId } from '@repo/api-contracts';

export function buildSimulationPrepareHref(input: {
  symbol: string;
  assetClass: SimulationAssetClass;
  lane: SimulationLaneId;
  side: 'buy' | 'sell';
  source?: string;
}) {
  const params = new URLSearchParams({
    intent: 'prepare',
    side: input.side,
    symbol: input.symbol,
    assetClass: input.assetClass,
    lane: input.lane,
  });
  if (input.source) {
    params.set('source', input.source);
  }
  return `/invest/simulation?${params.toString()}`;
}

