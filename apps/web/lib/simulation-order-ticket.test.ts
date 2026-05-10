import { describe, expect, it } from 'vitest';
import { getQuantityRules, notionalToQuantity, quantityToNotional } from './simulation-order-ticket';

describe('simulation-order-ticket', () => {
  it('uses whole-share steps for stocks when fractional is disabled', () => {
    const rules = getQuantityRules({ assetClass: 'stock', symbol: 'AAPL', price: 180, fractionalEnabled: false });
    expect(rules.step).toBe(1);
    expect(rules.minQuantity).toBe(1);
    expect(rules.minNotional).toBe(1);
  });

  it('uses fine step for high-price crypto', () => {
    const rules = getQuantityRules({ assetClass: 'crypto', symbol: 'BTCUSDT', price: 65000 });
    expect(rules.step).toBe(0.0001);
  });

  it('converts notional and quantity deterministically', () => {
    const qty = notionalToQuantity(100, 50, 0.01);
    expect(qty).toBe(2);
    expect(quantityToNotional(2, 50)).toBe(100);
  });
});
