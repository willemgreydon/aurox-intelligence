/**
 * Account Intelligence — pure, deterministic analytics derived from REAL
 * simulation data (transactions, orders, snapshots, summary). No I/O, no
 * fabricated history. Every derived figure is computed from data the simulation
 * engine already records; where a value is an estimate (e.g. P&L marked from the
 * latest available snapshot rather than a guaranteed daily close), the caller
 * labels it as estimated in the UI.
 *
 * Shared/pure so it is unit-testable in isolation and safe to run anywhere.
 */

export type AnalyticsTransaction = {
  transactionType: 'initial_funding' | 'buy' | 'sell' | 'reset';
  symbol: string | null;
  quantity: number | null;
  price: number | null;
  grossAmount: number;
  feeAmount: number;
  cashDelta: number;
  realizedPnl: number;
  createdAt: string;
};

export type AnalyticsSnapshot = {
  cashBalance: number;
  marketValue: number;
  equityValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  positionCount: number;
  takenAt: string;
};

// ── Moneyflow ───────────────────────────────────────────────────────────────

export type AssetMoneyflow = {
  symbol: string;
  buyVolume: number;
  sellVolume: number;
  netInvested: number;
  realizedPnl: number;
  tradeCount: number;
};

export type MoneyflowEvent = {
  symbol: string | null;
  amount: number;
  createdAt: string;
  type: 'buy' | 'sell';
};

export type MoneyflowSummary = {
  startingCapital: number | null;
  totalBuyVolume: number;
  totalSellVolume: number;
  netInvested: number;
  realizedPnl: number;
  totalFees: number;
  largestInflow: MoneyflowEvent | null;
  largestOutflow: MoneyflowEvent | null;
  assetFlows: AssetMoneyflow[];
};

function dayKey(iso: string): string {
  // First 10 chars of an ISO timestamp = YYYY-MM-DD. Avoids ambient Date.now().
  return iso.slice(0, 10);
}

export function computeMoneyflowSummary(transactions: AnalyticsTransaction[]): MoneyflowSummary {
  let totalBuyVolume = 0;
  let totalSellVolume = 0;
  let realizedPnl = 0;
  let totalFees = 0;
  let startingCapital: number | null = null;
  let largestInflow: MoneyflowEvent | null = null;
  let largestOutflow: MoneyflowEvent | null = null;

  const flows = new Map<string, AssetMoneyflow>();

  for (const tx of transactions) {
    totalFees += tx.feeAmount || 0;

    if (tx.transactionType === 'initial_funding') {
      startingCapital = (startingCapital ?? 0) + tx.cashDelta;
      continue;
    }

    if (tx.transactionType === 'buy' || tx.transactionType === 'sell') {
      const symbol = tx.symbol ?? 'UNKNOWN';
      const existing = flows.get(symbol) ?? {
        symbol,
        buyVolume: 0,
        sellVolume: 0,
        netInvested: 0,
        realizedPnl: 0,
        tradeCount: 0,
      };
      existing.tradeCount += 1;

      if (tx.transactionType === 'buy') {
        totalBuyVolume += tx.grossAmount;
        existing.buyVolume += tx.grossAmount;
        if (!largestOutflow || tx.grossAmount > largestOutflow.amount) {
          largestOutflow = { symbol: tx.symbol, amount: tx.grossAmount, createdAt: tx.createdAt, type: 'buy' };
        }
      } else {
        totalSellVolume += tx.grossAmount;
        realizedPnl += tx.realizedPnl || 0;
        existing.sellVolume += tx.grossAmount;
        existing.realizedPnl += tx.realizedPnl || 0;
        if (!largestInflow || tx.grossAmount > largestInflow.amount) {
          largestInflow = { symbol: tx.symbol, amount: tx.grossAmount, createdAt: tx.createdAt, type: 'sell' };
        }
      }

      existing.netInvested = existing.buyVolume - existing.sellVolume;
      flows.set(symbol, existing);
    }
  }

  const assetFlows = [...flows.values()].sort((a, b) => b.buyVolume - a.buyVolume);

  return {
    startingCapital,
    totalBuyVolume,
    totalSellVolume,
    netInvested: totalBuyVolume - totalSellVolume,
    realizedPnl,
    totalFees,
    largestInflow,
    largestOutflow,
    assetFlows,
  };
}

// ── Activity ────────────────────────────────────────────────────────────────

export type SymbolActivity = {
  symbol: string;
  tradeCount: number;
};

export type AccountActivitySummary = {
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  buySellRatio: number | null;
  journalEntryCount: number;
  activeDays: number;
  averageTradeSize: number | null;
  mostTradedSymbols: SymbolActivity[];
  lastActivityAt: string | null;
};

export function computeActivitySummary(
  transactions: AnalyticsTransaction[],
  journalEntryCount: number,
): AccountActivitySummary {
  let buyCount = 0;
  let sellCount = 0;
  let volume = 0;
  let lastActivityAt: string | null = null;
  const activeDays = new Set<string>();
  const symbolCounts = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.transactionType !== 'buy' && tx.transactionType !== 'sell') continue;
    if (tx.transactionType === 'buy') buyCount += 1;
    else sellCount += 1;
    volume += tx.grossAmount;
    activeDays.add(dayKey(tx.createdAt));
    if (!lastActivityAt || tx.createdAt > lastActivityAt) lastActivityAt = tx.createdAt;
    if (tx.symbol) symbolCounts.set(tx.symbol, (symbolCounts.get(tx.symbol) ?? 0) + 1);
  }

  const totalTrades = buyCount + sellCount;
  const mostTradedSymbols = [...symbolCounts.entries()]
    .map(([symbol, tradeCount]) => ({ symbol, tradeCount }))
    .sort((a, b) => b.tradeCount - a.tradeCount)
    .slice(0, 5);

  return {
    totalTrades,
    buyCount,
    sellCount,
    buySellRatio: sellCount > 0 ? buyCount / sellCount : buyCount > 0 ? null : null,
    journalEntryCount,
    activeDays: activeDays.size,
    averageTradeSize: totalTrades > 0 ? volume / totalTrades : null,
    mostTradedSymbols,
    lastActivityAt,
  };
}

// ── Daily performance (from real snapshots) ──────────────────────────────────

export type DailyAccountPoint = {
  date: string;
  accountValue: number;
  cashValue: number;
  investedValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  dailyPnL: number | null;
  dailyPnLPercent: number | null;
};

/**
 * Collapse event-driven snapshots into one point per calendar day (the last
 * snapshot recorded that day), then derive day-over-day P&L. Snapshots are real
 * captures (post-fill + worker cron), so this is observed account value — but
 * because capture is event-driven, a day with no activity/cron may be absent;
 * the UI labels the series "estimated daily".
 */
export function computeDailyPerformance(snapshots: AnalyticsSnapshot[]): DailyAccountPoint[] {
  if (snapshots.length === 0) return [];

  const sorted = [...snapshots].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  const lastByDay = new Map<string, AnalyticsSnapshot>();
  for (const snap of sorted) {
    lastByDay.set(dayKey(snap.takenAt), snap); // later snapshot overwrites earlier same-day
  }

  const days = [...lastByDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const points: DailyAccountPoint[] = [];
  let prevValue: number | null = null;

  for (const [date, snap] of days) {
    const accountValue = snap.equityValue;
    const dailyPnL = prevValue !== null ? accountValue - prevValue : null;
    const dailyPnLPercent = prevValue !== null && prevValue !== 0 ? (dailyPnL! / prevValue) * 100 : null;
    points.push({
      date,
      accountValue,
      cashValue: snap.cashBalance,
      investedValue: snap.marketValue,
      realizedPnL: snap.realizedPnl,
      unrealizedPnL: snap.unrealizedPnl,
      dailyPnL,
      dailyPnLPercent,
    });
    prevValue = accountValue;
  }

  return points;
}

export type PeriodPnL = {
  /** Absolute change in account value over the window. */
  changeAbsolute: number | null;
  changePercent: number | null;
  /** True when fewer than 2 daily points exist (so the figure is unavailable). */
  insufficientData: boolean;
};

/**
 * Period P&L from the daily series: compare the latest point to the point ~N
 * days earlier (by count of available daily points, since the series is
 * event-driven and may have gaps). `days = 1` → "today" vs previous point.
 */
export function computePeriodPnL(daily: DailyAccountPoint[], days: number): PeriodPnL {
  if (daily.length < 2) {
    return { changeAbsolute: null, changePercent: null, insufficientData: true };
  }
  const latest = daily[daily.length - 1]!;
  const targetIndex = Math.max(0, daily.length - 1 - days);
  const base = daily[targetIndex]!;
  const changeAbsolute = latest.accountValue - base.accountValue;
  const changePercent = base.accountValue !== 0 ? (changeAbsolute / base.accountValue) * 100 : null;
  return { changeAbsolute, changePercent, insufficientData: false };
}

// ── Insights ─────────────────────────────────────────────────────────────────

export type AccountInsightSummary = {
  bestDay: DailyAccountPoint | null;
  worstDay: DailyAccountPoint | null;
  averageDailyChange: number | null;
  winDays: number;
  lossDays: number;
  bestAsset: AssetMoneyflow | null;
  worstAsset: AssetMoneyflow | null;
  reviewSuggestions: string[];
};

export function computeAccountInsights(
  daily: DailyAccountPoint[],
  moneyflow: MoneyflowSummary,
  activity: AccountActivitySummary,
): AccountInsightSummary {
  const dayChanges = daily.filter((d) => d.dailyPnL !== null);
  let bestDay: DailyAccountPoint | null = null;
  let worstDay: DailyAccountPoint | null = null;
  let sum = 0;
  let winDays = 0;
  let lossDays = 0;
  for (const d of dayChanges) {
    const pnl = d.dailyPnL!;
    sum += pnl;
    if (pnl > 0) winDays += 1;
    else if (pnl < 0) lossDays += 1;
    if (!bestDay || pnl > bestDay.dailyPnL!) bestDay = d;
    if (!worstDay || pnl < worstDay.dailyPnL!) worstDay = d;
  }

  const tradedAssets = moneyflow.assetFlows.filter((a) => a.sellVolume > 0);
  let bestAsset: AssetMoneyflow | null = null;
  let worstAsset: AssetMoneyflow | null = null;
  for (const a of tradedAssets) {
    if (!bestAsset || a.realizedPnl > bestAsset.realizedPnl) bestAsset = a;
    if (!worstAsset || a.realizedPnl < worstAsset.realizedPnl) worstAsset = a;
  }

  const reviewSuggestions: string[] = [];
  if (activity.totalTrades === 0) {
    reviewSuggestions.push('Make your first paper trade to start building a performance history.');
  }
  if (activity.totalTrades > 0 && activity.journalEntryCount === 0) {
    reviewSuggestions.push('Add journal notes to your decisions to improve review quality.');
  }
  if (worstAsset && worstAsset.realizedPnl < 0) {
    reviewSuggestions.push(`Review ${worstAsset.symbol}: it is your largest realized loss contributor so far.`);
  }
  if (lossDays > winDays && dayChanges.length >= 3) {
    reviewSuggestions.push('More down days than up days recently — review position sizing and risk.');
  }

  return {
    bestDay,
    worstDay,
    averageDailyChange: dayChanges.length > 0 ? sum / dayChanges.length : null,
    winDays,
    lossDays,
    bestAsset,
    worstAsset,
    reviewSuggestions,
  };
}
