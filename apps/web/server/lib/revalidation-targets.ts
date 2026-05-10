import { revalidatePath } from 'next/cache';

function revalidateEach(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

export function revalidateForSimulationOrder(input: { symbol: string; assetClass: 'stock' | 'etf' | 'crypto' }) {
  const paths = [
    '/invest/simulation',
    '/invest/portfolio',
    '/portfolio/intelligence',
    '/invest/orders',
    '/invest/overview',
  ];
  if (input.assetClass === 'stock') {
    paths.push(`/stocks/${input.symbol}`);
  }
  if (input.assetClass === 'etf') {
    paths.push(`/invest/etfs/${input.symbol}`);
  }
  if (input.assetClass === 'crypto') {
    paths.push(`/invest/crypto/${input.symbol}`);
  }
  revalidateEach(paths);
}

export function revalidateForWatchlistChange(input: { symbol: string; assetClass: 'stock' | 'etf' | 'crypto' | 'fx' }) {
  const paths = [
    '/dashboard',
    '/invest',
    '/invest/simulation',
    '/market',
    '/observe',
    '/invest/stocks',
    '/invest/etfs',
    '/invest/crypto',
  ];
  if (input.assetClass === 'stock') {
    paths.push(`/stocks/${input.symbol}`);
  }
  if (input.assetClass === 'etf') {
    paths.push(`/invest/etfs/${input.symbol}`);
  }
  if (input.assetClass === 'crypto') {
    paths.push(`/invest/crypto/${input.symbol}`);
  }
  revalidateEach(paths);
}

export function revalidateForSimulationReset() {
  revalidateEach([
    '/dashboard',
    '/invest/simulation',
    '/invest/portfolio',
    '/invest/orders',
    '/invest/overview',
    '/portfolio/intelligence',
    '/observe',
  ]);
}

export function revalidateForAlertState() {
  revalidateEach(['/alerts', '/observe']);
}

export function revalidateForObservationState() {
  revalidateEach(['/observe', '/alerts']);
}
