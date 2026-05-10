import { describe, expect, it } from 'vitest';

describe('simulation-journal-service helpers', () => {
  describe('humanizeTransactionType', () => {
    it('humanizes initial_funding', async () => {
      process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? '01234567890123456789012345678901';
      const { humanizeTransactionType } = await import('./simulation-journal-service');
      expect(humanizeTransactionType('initial_funding')).toBe('Initial funding');
    });

    it('humanizes buy', async () => {
      process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? '01234567890123456789012345678901';
      const { humanizeTransactionType } = await import('./simulation-journal-service');
      expect(humanizeTransactionType('buy')).toBe('Simulated buy');
    });

    it('humanizes sell', async () => {
      process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? '01234567890123456789012345678901';
      const { humanizeTransactionType } = await import('./simulation-journal-service');
      expect(humanizeTransactionType('sell')).toBe('Simulated sell');
    });

    it('humanizes reset', async () => {
      process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? '01234567890123456789012345678901';
      const { humanizeTransactionType } = await import('./simulation-journal-service');
      expect(humanizeTransactionType('reset')).toBe('Cash adjustment');
    });

    it('returns unknown type as-is', async () => {
      process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? '01234567890123456789012345678901';
      const { humanizeTransactionType } = await import('./simulation-journal-service');
      expect(humanizeTransactionType('unknown_future_type')).toBe('unknown_future_type');
    });
  });

  it('parses source and lane from order notes', async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? '01234567890123456789012345678901';
    const { parseOrderSource } = await import('./simulation-journal-service');
    const parsed = parseOrderSource('session=x;lane=manual_multi_asset_lane;source=portfolio-intelligence');
    expect(parsed.source).toBe('portfolio-intelligence');
    expect(parsed.lane).toBe('manual_multi_asset_lane');
  });

  it('escapes CSV safely', async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? '01234567890123456789012345678901';
    const { toCsv } = await import('./simulation-journal-service');
    type SimulationJournalRow = import('./simulation-journal-service').SimulationJournalRow;
    const rows: SimulationJournalRow[] = [{
      id: '1',
      timestamp: '2026-01-01T00:00:00.000Z',
      side: 'BUY',
      symbol: 'AAPL',
      assetClass: 'stock',
      quantity: 1,
      price: 100,
      notional: 100,
      feeEstimate: 0,
      slippageEstimate: 0,
      confidence: null,
      signalScore: null,
      riskScore: null,
      newsImpact: null,
      guardrailResult: 'PASS',
      source: 'simulation',
      lane: null,
      decisionReason: 'quoted "reason"',
      cashImpact: -100,
      positionImpact: '+1',
      outcomeStatus: 'PENDING',
      realizedPnl: 0,
      unrealizedPnl: null,
      replayHref: null,
    }];
    const csv = toCsv(rows);
    expect(csv).toContain('"quoted ""reason"""');
  });
});
