import { getAssetInspectHref } from './market-routes';

export function resolveInspectHref(input: { symbol?: string | null; assetClass?: string | null; detailHref?: string }) {
  const symbol = input.symbol?.trim();
  if (!symbol) return null;
  return input.detailHref ?? getAssetInspectHref({ symbol, assetClass: input.assetClass });
}
