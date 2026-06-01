import { describe, expect, it } from 'vitest';
import {
  computeAccountInsights,
  computeActivitySummary,
  computeDailyPerformance,
  computeMoneyflowSummary,
  computePeriodPnL,
  type AnalyticsSnapshot,
  type AnalyticsTransaction,
} from './account-analytics';

function tx(partial: Partial<AnalyticsTransaction> & Pick<AnalyticsTransaction, 'transactionType'>): AnalyticsTransaction {
  return {
    symbol: null,
    quantity: null,
    price: null,
    grossAmount: 0,
    feeAmount: 0,
    cashDelta: 0,
    realizedPnl: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function snap(takenAt: string, equityValue: number, extra: Partial<AnalyticsSnapshot> = {}): AnalyticsSnapshot {
  return {
    cashBalance: extra.cashBalance ?? equityValue,
    marketValue: extra.marketValue ?? 0,
    equityValue,
    unrealizedPnl: extra.unrealizedPnl ?? 0,
    realizedPnl: extra.realizedPnl ?? 0,
    positionCount: extra.positionCount ?? 0,
    takenAt,
  };
}

const TRANSACTIONS: AnalyticsTransaction[] = [
  tx({ transactionType: 'initial_funding', cashDelta: 100000, grossAmount: 0, createdAt: '2026-01-01T09:00:00.000Z' }),
  tx({ transactionType: 'buy', symbol: 'AAPL', grossAmount: 1000, feeAmount: 1, cashDelta: -1001, createdAt: '2026-01-02T10:00:00.000Z' }),
  tx({ transactionType: 'buy', symbol: 'BTC-USD', grossAmount: 2000, feeAmount: 4, cashDelta: -2004, createdAt: '2026-01-02T11:00:00.000Z' }),
  tx({ transactionType: 'sell', symbol: 'AAPL', grossAmount: 1200, feeAmount: 1, cashDelta: 1199, realizedPnl: 200, createdAt: '2026-01-05T10:00:00.000Z' }),
  tx({ transactionType: 'sell', symbol: 'BTC-USD', grossAmount: 1500, feeAmount: 3, cashDelta: 1497, realizedPnl: -500, createdAt: '2026-01-06T10:00:00.000Z' }),
];

describe('computeMoneyflowSummary', () => {
  it('returns zeroed flows for an empty account', () => {
    const m = computeMoneyflowSummary([]);
    expect(m.totalBuyVolume).toBe(0);
    expect(m.totalSellVolume).toBe(0);
    expect(m.netInvested).toBe(0);
    expect(m.startingCapital).toBeNull();
    expect(m.assetFlows).toHaveLength(0);
  });

  it('captures starting capital from initial_funding only', () => {
    const m = computeMoneyflowSummary(TRANSACTIONS);
    expect(m.startingCapital).toBe(100000);
  });

  it('computes buy/sell volume, net invested, realized P&L, fees', () => {
    const m = computeMoneyflowSummary(TRANSACTIONS);
    expect(m.totalBuyVolume).toBe(3000); // 1000 + 2000
    expect(m.totalSellVolume).toBe(2700); // 1200 + 1500
    expect(m.netInvested).toBe(300);
    expect(m.realizedPnl).toBe(-300); // +200 - 500
    expect(m.totalFees).toBe(9); // 1+4+1+3
  });

  it('tracks largest inflow (sell) and outflow (buy)', () => {
    const m = computeMoneyflowSummary(TRANSACTIONS);
    expect(m.largestOutflow).toMatchObject({ symbol: 'BTC-USD', amount: 2000, type: 'buy' });
    expect(m.largestInflow).toMatchObject({ symbol: 'BTC-USD', amount: 1500, type: 'sell' });
  });

  it('builds per-asset flows with realized P&L', () => {
    const m = computeMoneyflowSummary(TRANSACTIONS);
    const aapl = m.assetFlows.find((a) => a.symbol === 'AAPL');
    const btc = m.assetFlows.find((a) => a.symbol === 'BTC-USD');
    expect(aapl).toMatchObject({ buyVolume: 1000, sellVolume: 1200, netInvested: -200, realizedPnl: 200, tradeCount: 2 });
    expect(btc).toMatchObject({ buyVolume: 2000, sellVolume: 1500, netInvested: 500, realizedPnl: -500, tradeCount: 2 });
  });
});

describe('computeActivitySummary', () => {
  it('handles a cash-only / no-trade account', () => {
    const a = computeActivitySummary([tx({ transactionType: 'initial_funding', cashDelta: 100000 })], 0);
    expect(a.totalTrades).toBe(0);
    expect(a.averageTradeSize).toBeNull();
    expect(a.mostTradedSymbols).toHaveLength(0);
    expect(a.lastActivityAt).toBeNull();
  });

  it('counts buys/sells, active days, average trade size, last activity', () => {
    const a = computeActivitySummary(TRANSACTIONS, 2);
    expect(a.buyCount).toBe(2);
    expect(a.sellCount).toBe(2);
    expect(a.totalTrades).toBe(4);
    expect(a.journalEntryCount).toBe(2);
    expect(a.activeDays).toBe(3); // 01-02, 01-05, 01-06
    expect(a.averageTradeSize).toBeCloseTo((3000 + 2700) / 4, 5);
    expect(a.lastActivityAt).toBe('2026-01-06T10:00:00.000Z');
    expect(a.mostTradedSymbols[0]?.tradeCount).toBe(2);
  });
});

describe('computeDailyPerformance', () => {
  it('returns [] for no snapshots', () => {
    expect(computeDailyPerformance([])).toHaveLength(0);
  });

  it('collapses multiple same-day snapshots to the last, derives day-over-day P&L', () => {
    const points = computeDailyPerformance([
      snap('2026-01-02T10:00:00.000Z', 100000),
      snap('2026-01-02T15:00:00.000Z', 100050), // later same day wins
      snap('2026-01-03T15:00:00.000Z', 100500),
    ]);
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ date: '2026-01-02', accountValue: 100050, dailyPnL: null });
    expect(points[1]!.accountValue).toBe(100500);
    expect(points[1]!.dailyPnL).toBe(450);
    expect(points[1]!.dailyPnLPercent).toBeCloseTo((450 / 100050) * 100, 5);
  });
});

describe('computePeriodPnL', () => {
  const daily = computeDailyPerformance([
    snap('2026-01-01T15:00:00.000Z', 100000),
    snap('2026-01-02T15:00:00.000Z', 101000),
    snap('2026-01-03T15:00:00.000Z', 100500),
  ]);

  it('reports insufficient data with <2 points', () => {
    const p = computePeriodPnL(daily.slice(0, 1), 1);
    expect(p.insufficientData).toBe(true);
    expect(p.changeAbsolute).toBeNull();
  });

  it('computes today (1-step) change', () => {
    const p = computePeriodPnL(daily, 1);
    expect(p.changeAbsolute).toBe(-500); // 100500 - 101000
  });

  it('clamps the window to the available range for longer periods', () => {
    const p = computePeriodPnL(daily, 30);
    expect(p.changeAbsolute).toBe(500); // latest 100500 vs first 100000
  });
});

describe('computeAccountInsights', () => {
  it('identifies best/worst day and best/worst asset', () => {
    const daily = computeDailyPerformance([
      snap('2026-01-01T15:00:00.000Z', 100000),
      snap('2026-01-02T15:00:00.000Z', 101000), // +1000 best
      snap('2026-01-03T15:00:00.000Z', 100200), // -800 worst
    ]);
    const moneyflow = computeMoneyflowSummary(TRANSACTIONS);
    const activity = computeActivitySummary(TRANSACTIONS, 0);
    const insights = computeAccountInsights(daily, moneyflow, activity);

    expect(insights.bestDay?.date).toBe('2026-01-02');
    expect(insights.worstDay?.date).toBe('2026-01-03');
    expect(insights.winDays).toBe(1);
    expect(insights.lossDays).toBe(1);
    expect(insights.bestAsset?.symbol).toBe('AAPL'); // +200
    expect(insights.worstAsset?.symbol).toBe('BTC-USD'); // -500
    // no journal entries but trades exist → suggestion present
    expect(insights.reviewSuggestions.some((s) => s.toLowerCase().includes('journal'))).toBe(true);
  });

  it('suggests a first trade for an empty account', () => {
    const insights = computeAccountInsights([], computeMoneyflowSummary([]), computeActivitySummary([], 0));
    expect(insights.reviewSuggestions.some((s) => s.toLowerCase().includes('first paper trade'))).toBe(true);
  });
});
