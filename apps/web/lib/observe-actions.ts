import { buildSimulationPrepareHrefForAsset } from './simulation-prepare-url';

export function buildSimulationTicketHref(input?: { symbol?: string | null; assetClass?: string | null; side?: 'buy' | 'sell' } | null): string {
  if (!input?.symbol) return '/invest/simulation';
  return buildSimulationPrepareHrefForAsset({
    symbol: input.symbol,
    assetClass: input.assetClass,
    side: input.side ?? 'buy',
    source: 'observe',
  });
}
