import { describe, expect, it } from 'vitest';
import {
  normalizeTrackedSymbols,
  validateTrackedSymbols,
  validateWorkspacePreferences,
} from './workspace-preferences';

describe('workspace preferences helpers', () => {
  it('normalizes tracked symbols and removes duplicates', () => {
    const result = normalizeTrackedSymbols('aapl, msft, AAPL,  nvda ');
    expect(result).toEqual(['AAPL', 'MSFT', 'NVDA']);
  });

  it('filters invalid tracked symbols', () => {
    const result = validateTrackedSymbols(['AAPL', '$$$', 'BINANCE:BTCUSDT']);
    expect(result.normalized).toEqual(['AAPL', 'BINANCE:BTCUSDT']);
    expect(result.invalid).toEqual(['$$$']);
  });

  it('validates numeric preference ranges', () => {
    const invalid = validateWorkspacePreferences({
      brokerModeCapitalLimitUsd: 0,
      microTradeAllocationPercent: 101,
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.fieldErrors.brokerModeCapitalLimitUsd).toBeTruthy();
    expect(invalid.fieldErrors.microTradeAllocationPercent).toBeTruthy();
  });
});

