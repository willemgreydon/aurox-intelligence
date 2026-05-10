import { describe, expect, it } from 'vitest';
import {
  fromProviderSymbol,
  normalizeInternalSymbol,
  toBinanceSymbol,
  toBybitSymbol,
  toCoinbaseSymbol,
  toOkxSymbol,
} from '../market-stream/symbol-normalization';

describe('market-stream symbol normalization', () => {
  it('normalizes compact and dashed crypto pairs', () => {
    expect(normalizeInternalSymbol('BTCUSDT')).toBe('BTC/USDT');
    expect(normalizeInternalSymbol('BTC-USDT')).toBe('BTC/USDT');
    expect(normalizeInternalSymbol('BTC-USD')).toBe('BTC/USD');
    expect(fromProviderSymbol('coinbase', 'ETH-USD')).toBe('ETH/USD');
  });

  it('keeps equity symbols unchanged', () => {
    expect(normalizeInternalSymbol('AAPL')).toBe('AAPL');
    expect(normalizeInternalSymbol('SPY')).toBe('SPY');
  });

  it('formats provider symbols deterministically', () => {
    expect(toBinanceSymbol('BTC/USDT')).toBe('BTCUSDT');
    expect(toBybitSymbol('ETH/USDT')).toBe('ETHUSDT');
    expect(toOkxSymbol('BTC/USDT')).toBe('BTC-USDT');
    expect(toCoinbaseSymbol('BTC/USD')).toBe('BTC-USD');
  });
});
