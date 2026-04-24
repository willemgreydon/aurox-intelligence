import type { IngestionAssetKind, IngestionRecord } from './types';

type CanonicalizeInput = {
  symbol: string;
  provider: string;
  observedAt?: string | null;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
};

const ETF_SYMBOLS = new Set(['SPY', 'QQQ', 'VTI', 'IWM', 'TLT', 'XLK', 'XLF', 'XLE', 'GLD', 'VOO']);
const INDEX_SYMBOLS = new Set(['SPX', 'NDX', 'DJI', 'RUT', 'VIX']);

function toFiniteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toIsoTimestampOrNull(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function normalizeCryptoPair(raw: string): string | null {
  const cleaned = raw.replace(/^BINANCE:/, '').replace(/[\/_]/g, '-').toUpperCase();
  const dashed = cleaned.match(/^([A-Z0-9]{2,12})-([A-Z0-9]{3,5})$/);

  if (dashed) {
    const [, base, quote] = dashed;
    if (quote === 'USD' || quote === 'USDT') {
      return `BINANCE:${base}USDT`;
    }
    return `BINANCE:${base}${quote}`;
  }

  const compact = cleaned.replace(/-/g, '');
  for (const quote of ['USDT', 'USD', 'BTC', 'ETH']) {
    if (compact.endsWith(quote) && compact.length > quote.length) {
      const base = compact.slice(0, -quote.length);
      if (quote === 'USD') {
        return `BINANCE:${base}USDT`;
      }
      return `BINANCE:${base}${quote}`;
    }
  }

  return null;
}

export function canonicalizeSymbol(symbol: string): string {
  const raw = symbol.trim().toUpperCase();

  if (!raw) {
    return raw;
  }

  if (raw.startsWith('OANDA:')) {
    return raw.replace('/', '_');
  }

  if (raw.startsWith('BINANCE:')) {
    return normalizeCryptoPair(raw) ?? raw;
  }

  const compactCrypto = normalizeCryptoPair(raw);
  if (compactCrypto) {
    return compactCrypto;
  }

  if (raw.includes('/') || raw.includes('-')) {
    const crypto = normalizeCryptoPair(raw);
    if (crypto) {
      return crypto;
    }
  }

  if (raw.endsWith('.US')) {
    return raw.slice(0, -3);
  }

  return raw;
}

export function detectAssetKind(symbol: string): IngestionAssetKind {
  if (symbol.startsWith('BINANCE:')) {
    return 'crypto';
  }

  if (symbol.startsWith('OANDA:') || /^[A-Z]{3}_[A-Z]{3}$/.test(symbol)) {
    return 'fx';
  }

  if (ETF_SYMBOLS.has(symbol)) {
    return 'etf';
  }

  if (INDEX_SYMBOLS.has(symbol)) {
    return 'index';
  }

  return 'stock';
}

export function canonicalizeIngestionRecord(input: CanonicalizeInput): IngestionRecord {
  const canonicalSymbol = canonicalizeSymbol(input.symbol);
  return {
    sourceSymbol: input.symbol.trim().toUpperCase(),
    canonicalSymbol,
    assetKind: detectAssetKind(canonicalSymbol),
    provider: input.provider.trim().toLowerCase(),
    observedAt: toIsoTimestampOrNull(input.observedAt),
    price: toFiniteOrNull(input.price),
    change: toFiniteOrNull(input.change),
    changePercent: toFiniteOrNull(input.changePercent),
  };
}
