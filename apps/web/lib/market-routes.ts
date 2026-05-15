import type { SimulationAssetClass, SimulationLaneId } from '@repo/api-contracts';

type InspectAssetInput = {
  symbol?: string | null;
  assetClass?: string | null;
  type?: string | null;
  provider?: string | null;
};

export function normalizeAssetClass(value?: string | null): SimulationAssetClass | 'index' | 'macro' | 'other' {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'stock' || normalized === 'equity') return 'stock';
  if (normalized === 'etf') return 'etf';
  if (normalized === 'crypto' || normalized === 'digital_asset') return 'crypto';
  if (normalized === 'index' || normalized === 'indices') return 'index';
  if (normalized === 'macro' || normalized === 'fx' || normalized === 'forex') return 'macro';
  return 'other';
}

export function getAssetInspectHref(asset: InspectAssetInput): string {
  const symbol = asset.symbol?.trim();
  if (!symbol) {
    return '/market';
  }

  const assetClass = normalizeAssetClass(asset.assetClass ?? asset.type);
  const encodedSymbol = encodeURIComponent(symbol);

  if (assetClass === 'crypto') {
    return `/invest/crypto?symbol=${encodedSymbol}`;
  }
  if (assetClass === 'etf') {
    return `/invest/etfs?symbol=${encodedSymbol}`;
  }
  if (assetClass === 'stock' || assetClass === 'index') {
    return `/invest/stocks/${encodedSymbol}`;
  }
  if (assetClass === 'macro') {
    return `/market?assetClass=macro&symbol=${encodedSymbol}#macro`;
  }
  return `/market?symbol=${encodedSymbol}`;
}

export function getSimulationLaneForAssetClass(assetClass?: string | null): SimulationLaneId {
  const normalized = normalizeAssetClass(assetClass);
  if (normalized === 'crypto' || normalized === 'etf') {
    return 'manual_multi_asset_lane';
  }
  return 'manual_stock_lane';
}
