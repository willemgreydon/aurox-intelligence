import { describe, expect, it } from 'vitest';
import { getClaudeFinanceProvider } from '../ai/claude-finance';

describe('Claude finance provider', () => {
  it('returns degraded fallback when API key is missing', async () => {
    const provider = getClaudeFinanceProvider();
    const result = await provider.analyze({
      assetId: 'asset:aapl',
      symbol: 'AAPL',
      assetClass: 'stock',
    });
    expect(result.symbol).toBe('AAPL');
    if (!provider.isConfigured()) {
      expect(result.degraded).toBe(true);
    }
  });
});
