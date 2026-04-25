import { createHash } from 'node:crypto';

export function hashSymbols(symbols: string[]) {
  const normalized = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].sort();
  return createHash('sha1').update(normalized.join(',')).digest('hex').slice(0, 12);
}

