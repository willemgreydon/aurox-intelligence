import type { MarketStreamAssetClass } from './contracts';

type ProviderFmt = 'binance' | 'bybit' | 'okx' | 'coinbase';

const STABLE_QUOTES = ['USDT', 'USD', 'USDC', 'BTC', 'ETH', 'EUR'] as const;

function splitCompactPair(input: string): [string, string] | null {
  for (const quote of STABLE_QUOTES) {
    if (input.endsWith(quote) && input.length > quote.length) {
      return [input.slice(0, -quote.length), quote];
    }
  }
  return null;
}

export function normalizeInternalSymbol(symbol: string): string {
  const raw = symbol.trim().toUpperCase();
  if (!raw) return raw;

  if (raw.startsWith('BINANCE:')) {
    const compact = raw.slice('BINANCE:'.length).replace(/[\/_-]/g, '');
    const parts = splitCompactPair(compact);
    if (parts) return `${parts[0]}/${parts[1]}`;
  }

  if (raw.includes('-') || raw.includes('/')) {
    const [base, quote] = raw.replace('/', '-').split('-');
    if (base && quote) return `${base}/${quote}`;
  }

  const compact = raw.replace(/[\/_-]/g, '');
  const parts = splitCompactPair(compact);
  if (parts) return `${parts[0]}/${parts[1]}`;

  if (/^[A-Z.]{1,12}$/.test(raw)) {
    return raw;
  }

  return raw;
}

export function fromProviderSymbol(provider: ProviderFmt, symbol: string): string {
  const raw = symbol.trim().toUpperCase();
  if (!raw) return raw;
  if (provider === 'coinbase') {
    return normalizeInternalSymbol(raw.replace('-', '/'));
  }
  return normalizeInternalSymbol(raw);
}

function toCompactPair(symbol: string): [string, string] | null {
  const normalized = normalizeInternalSymbol(symbol);
  if (!normalized.includes('/')) return null;
  const [base, quote] = normalized.split('/');
  if (!base || !quote) return null;
  return [base, quote];
}

export function toBinanceSymbol(symbol: string): string {
  const pair = toCompactPair(symbol);
  return pair ? `${pair[0]}${pair[1]}` : symbol.trim().toUpperCase();
}

export function toBybitSymbol(symbol: string): string {
  return toBinanceSymbol(symbol);
}

export function toOkxSymbol(symbol: string): string {
  const pair = toCompactPair(symbol);
  return pair ? `${pair[0]}-${pair[1]}` : symbol.trim().toUpperCase();
}

export function toCoinbaseSymbol(symbol: string): string {
  const pair = toCompactPair(symbol);
  return pair ? `${pair[0]}-${pair[1]}` : symbol.trim().toUpperCase();
}

export function inferAssetClassFromSymbol(symbol: string): MarketStreamAssetClass {
  const normalized = normalizeInternalSymbol(symbol);
  if (normalized.includes('/')) return 'crypto';
  if (['SPY', 'QQQ', 'VTI', 'IWM', 'GLD'].includes(normalized)) return 'etf';
  if (['SPX', 'NDX', 'DJI', 'VIX'].includes(normalized)) return 'index';
  return 'stock';
}
