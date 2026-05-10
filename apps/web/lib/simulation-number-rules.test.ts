import { describe, expect, it } from 'vitest';
import {
  getAgentCapRules,
  getSimulationQuantityRules,
  isStepAligned,
} from './simulation-number-rules';

describe('simulation-number-rules', () => {
  it('supports whole-share stock quantities', () => {
    const rules = getSimulationQuantityRules({ assetClass: 'stock', symbol: 'AMD', price: 150, fractionalEnabled: false });
    expect(rules.minQuantity).toBe(1);
    expect(rules.stepQuantity).toBe(1);
    expect(isStepAligned(1, rules.minQuantity, rules.stepQuantity)).toBe(true);
    expect(isStepAligned(2, rules.minQuantity, rules.stepQuantity)).toBe(true);
    expect(isStepAligned(10, rules.minQuantity, rules.stepQuantity)).toBe(true);
    expect(isStepAligned(1.5, rules.minQuantity, rules.stepQuantity)).toBe(false);
  });

  it('supports common notional amounts', () => {
    const rules = getSimulationQuantityRules({ assetClass: 'stock', symbol: 'AAPL', price: 190 });
    expect(rules.minNotional).toBe(1);
    expect(rules.stepNotional).toBe(1);
    [25, 100, 500, 2000].forEach((value) => {
      expect(isStepAligned(value, rules.minNotional, rules.stepNotional)).toBe(true);
    });
  });

  it('supports btc micro quantities', () => {
    const rules = getSimulationQuantityRules({ assetClass: 'crypto', symbol: 'BTCUSDT', price: 65000 });
    expect(rules.minQuantity).toBe(0.0001);
    expect(rules.stepQuantity).toBe(0.0001);
    expect(isStepAligned(0.0001, rules.minQuantity, rules.stepQuantity)).toBe(true);
    expect(isStepAligned(0.001, rules.minQuantity, rules.stepQuantity)).toBe(true);
  });

  it('keeps ai cap defaults aligned with common values', () => {
    const rules = getAgentCapRules();
    expect(rules.min).toBe(1);
    expect(rules.step).toBe(1);
    [500, 2000, 5000, 10000].forEach((value) => {
      expect(isStepAligned(value, rules.min, rules.step)).toBe(true);
    });
  });
});

