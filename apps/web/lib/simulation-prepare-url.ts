import type { SimulationAssetClass, SimulationLaneId } from '@repo/api-contracts';
import { getSimulationLaneForAssetClass, normalizeAssetClass } from './market-routes';

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

export function buildSimulationPrepareHrefForAsset(input: {
  symbol?: string | null;
  assetClass?: string | null;
  side: 'buy' | 'sell';
  source?: string;
}) {
  const symbol = input.symbol?.trim();
  const normalizedAssetClass = normalizeAssetClass(input.assetClass);

  if (!symbol || (normalizedAssetClass !== 'stock' && normalizedAssetClass !== 'etf' && normalizedAssetClass !== 'crypto')) {
    const params = new URLSearchParams({ intent: 'prepare', side: input.side });
    if (input.source) {
      params.set('source', input.source);
    }
    return `/invest/simulation?${params.toString()}`;
  }

  return buildSimulationPrepareHref({
    symbol,
    assetClass: normalizedAssetClass,
    lane: getSimulationLaneForAssetClass(normalizedAssetClass),
    side: input.side,
    source: input.source,
  });
}

