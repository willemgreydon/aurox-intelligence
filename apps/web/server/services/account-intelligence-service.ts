import { getSimulationWorkspace, getUserWatchlist } from '@repo/db';
import type { Locale } from '@repo/api-contracts';
import { requireCurrentSession } from '../auth/session';
import { getSimulationJournalRowsForCurrentUser } from './simulation-journal-service';
import {
  computeAccountInsights,
  computeActivitySummary,
  computeConcentration,
  computeDailyPerformance,
  computeJournalCoverageRate,
  computeMoneyflowSummary,
  computePeriodPnL,
  type DailyAccountPoint,
} from '../../lib/account-analytics';
import { formatCurrencyLabel } from '../../lib/formatters';

/**
 * Account Intelligence service.
 *
 * Orchestrates the real simulation workspace (summary, transactions, orders,
 * snapshots, positions) plus journal/watchlist counts, runs the pure analytics
 * engine, and returns a fully display-ready view model. No fabricated data:
 * the daily timeline comes from real captured snapshots; period P&L is marked
 * estimated when the snapshot series is too short.
 */

type Tone = 'positive' | 'negative' | 'neutral';

export type AccountMetric = {
  label: string;
  tone: Tone;
  available: boolean;
};

export type AccountTimelinePoint = {
  date: string;
  accountValue: number;
  dailyPnL: number | null;
};

export type AccountIntelligenceViewModel = {
  identity: {
    userName: string;
    email: string;
    memberSinceLabel: string;
    lastActivityLabel: string;
  };
  simulationOnlyNotice: string;
  hasAccount: boolean;
  hasTrades: boolean;
  hero: {
    totalValueLabel: string;
    cashLabel: string;
    investedLabel: string;
    unrealizedPnl: AccountMetric;
    realizedPnl: AccountMetric;
    todayPnl: AccountMetric;
    sevenDayPnl: AccountMetric;
    thirtyDayPnl: AccountMetric;
    positionCount: number;
    tradeCount: number;
  };
  timeline: {
    hasData: boolean;
    points: AccountTimelinePoint[];
    bestDayLabel: string | null;
    worstDayLabel: string | null;
    averageDailyLabel: string | null;
    winLossLabel: string | null;
    estimatedNote: string;
  };
  moneyflow: {
    hasData: boolean;
    startingCapitalLabel: string;
    buyVolumeLabel: string;
    sellVolumeLabel: string;
    netInvestedLabel: string;
    realizedPnl: AccountMetric;
    feesLabel: string;
    largestInflowLabel: string | null;
    largestOutflowLabel: string | null;
    assetFlows: Array<{
      symbol: string;
      buyLabel: string;
      sellLabel: string;
      realizedPnl: AccountMetric;
      tradeCount: number;
    }>;
  };
  activity: {
    totalTrades: number;
    buyCount: number;
    sellCount: number;
    buySellRatioLabel: string;
    activeDays: number;
    averageTradeSizeLabel: string;
    journalEntryCount: number;
    watchlistCount: number;
    mostTradedSymbols: Array<{ symbol: string; tradeCount: number }>;
  };
  insights: {
    reviewSuggestions: string[];
    bestAssetLabel: string | null;
    worstAssetLabel: string | null;
  };
  /** Realized P/L contribution per traded asset, for a diverging-bar chart. */
  assetContributions: {
    hasData: boolean;
    maxAbsolute: number;
    items: Array<{ symbol: string; realizedPnl: number; label: string; tone: Tone }>;
  };
  /** Risk / concentration / behaviour intelligence from open positions. */
  risk: {
    hasPositions: boolean;
    concentrationLevel: 'low' | 'moderate' | 'high' | 'unknown';
    largestPositionLabel: string | null;
    topThreeWeightLabel: string | null;
    cashDeploymentLabel: string;
    cashDeploymentRatio: number;
    journalCoverageLabel: string;
    bestUnrealizedLabel: string | null;
    worstUnrealizedLabel: string | null;
    warnings: string[];
  };
  recentActions: Array<{
    id: string;
    label: string;
    detail: string;
    tone: Tone;
    timestampLabel: string;
  }>;
};

const SIMULATION_ONLY_NOTICE =
  'Simulated performance · paper trading. Values are estimated from available quote data. Not financial advice.';

function currency(value: number | null | undefined, code: 'USD' | 'EUR', locale: Locale): string {
  return formatCurrencyLabel(value, code, locale, '—');
}

function signedCurrency(value: number | null | undefined, code: 'USD' | 'EUR', locale: Locale): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${currency(value, code, locale)}`;
}

function toneOf(value: number | null | undefined): Tone {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

function pnlMetric(value: number | null, code: 'USD' | 'EUR', percent: number | null | undefined, locale: Locale): AccountMetric {
  if (value === null || !Number.isFinite(value)) {
    return { label: 'Not enough data', tone: 'neutral', available: false };
  }
  const pct = percent !== undefined && percent !== null && Number.isFinite(percent) ? ` (${percent > 0 ? '+' : ''}${percent.toFixed(2)}%)` : '';
  return { label: `${signedCurrency(value, code, locale)}${pct}`, tone: toneOf(value), available: true };
}

function dateLabel(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function dateTimeLabel(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale === 'de' ? 'de-DE' : locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function dayPnlLabel(point: DailyAccountPoint | null, code: 'USD' | 'EUR', locale: Locale): string | null {
  if (!point || point.dailyPnL === null) return null;
  return `${dateLabel(point.date, locale)} · ${signedCurrency(point.dailyPnL, code, locale)}`;
}

export async function getAccountIntelligenceViewModel(locale: Locale = 'en'): Promise<AccountIntelligenceViewModel> {
  const auth = await requireCurrentSession('/account');

  const [workspace, journalRows, watchlist] = await Promise.all([
    getSimulationWorkspace(auth.user.id).catch(() => null),
    getSimulationJournalRowsForCurrentUser(120).catch(() => []),
    getUserWatchlist(auth.user.id).catch(() => []),
  ]);

  const code: 'USD' | 'EUR' = workspace?.summary.currency ?? 'USD';
  const transactions = workspace?.transactions ?? [];
  const snapshots = workspace?.snapshots ?? [];
  const journalEntryCount = journalRows.filter((row) => row.side !== 'RESET').length;

  const moneyflow = computeMoneyflowSummary(transactions);
  const activity = computeActivitySummary(transactions, journalEntryCount);
  const daily = computeDailyPerformance(snapshots);
  const insights = computeAccountInsights(daily, moneyflow, activity);
  const positions = (workspace?.positions ?? []).map((p) => ({
    symbol: p.symbol,
    marketValue: p.marketValue,
    unrealizedPnl: p.unrealizedPnl,
  }));
  const concentration = computeConcentration(positions);
  const journalCoverage = computeJournalCoverageRate(activity.totalTrades, journalEntryCount);
  const summary = workspace?.summary ?? null;

  // Asset realized-P/L contributions (only assets actually sold).
  const contributionItems = moneyflow.assetFlows
    .filter((flow) => flow.sellVolume > 0)
    .map((flow) => ({ symbol: flow.symbol, realizedPnl: flow.realizedPnl }))
    .sort((a, b) => Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl))
    .slice(0, 8);
  const maxAbsContribution = contributionItems.reduce((m, c) => Math.max(m, Math.abs(c.realizedPnl)), 0);

  const cashDeploymentRatio =
    summary && summary.equityValue > 0 ? Math.min(1, Math.max(0, summary.investedCapital / summary.equityValue)) : 0;

  const riskWarnings: string[] = [];
  if (concentration.level === 'high' && concentration.largestSymbol) {
    riskWarnings.push(
      `Your largest simulated exposure is ${concentration.largestSymbol} (${Math.round((concentration.largestWeight ?? 0) * 100)}% of positions). Review position weight before adding more.`,
    );
  }
  if (cashDeploymentRatio > 0.85) {
    riskWarnings.push('Cash deployment is high — most simulated capital is invested. Consider reviewing concentration.');
  }
  if (journalCoverage !== null && journalCoverage < 0.5 && activity.totalTrades >= 3) {
    riskWarnings.push('Several paper trades have no journal rationale yet. Documenting decisions improves review quality.');
  }

  const todayPnl = computePeriodPnL(daily, 1);
  const sevenDayPnl = computePeriodPnL(daily, 7);
  const thirtyDayPnl = computePeriodPnL(daily, 30);

  const hasAccount = workspace !== null;
  const hasTrades = activity.totalTrades > 0;

  // Recent actions: last 5 buy/sell transactions, newest first.
  const recentActions = transactions
    .filter((tx) => tx.transactionType === 'buy' || tx.transactionType === 'sell')
    .slice(-5)
    .reverse()
    .map((tx, index) => {
      const isBuy = tx.transactionType === 'buy';
      return {
        id: `${tx.createdAt}-${index}`,
        label: `${isBuy ? 'Simulated buy' : 'Simulated sell'} ${tx.symbol ?? ''}`.trim(),
        detail: `${currency(tx.grossAmount, code, locale)}${tx.realizedPnl ? ` · realized ${signedCurrency(tx.realizedPnl, code, locale)}` : ''}`,
        tone: isBuy ? ('neutral' as Tone) : toneOf(tx.realizedPnl),
        timestampLabel: dateTimeLabel(tx.createdAt, locale),
      };
    });

  return {
    identity: {
      userName: auth.user.name,
      email: auth.user.email,
      memberSinceLabel: dateLabel(auth.user.createdAt, locale),
      lastActivityLabel: activity.lastActivityAt ? dateTimeLabel(activity.lastActivityAt, locale) : 'No activity yet',
    },
    simulationOnlyNotice: SIMULATION_ONLY_NOTICE,
    hasAccount,
    hasTrades,
    hero: {
      totalValueLabel: currency(summary?.equityValue ?? 0, code, locale),
      cashLabel: currency(summary?.availableCash ?? 0, code, locale),
      investedLabel: currency(summary?.investedCapital ?? 0, code, locale),
      unrealizedPnl: pnlMetric(summary ? summary.unrealizedPnl : null, code, undefined, locale),
      realizedPnl: pnlMetric(summary ? summary.realizedPnl : null, code, undefined, locale),
      todayPnl: pnlMetric(todayPnl.changeAbsolute, code, todayPnl.changePercent, locale),
      sevenDayPnl: pnlMetric(sevenDayPnl.changeAbsolute, code, sevenDayPnl.changePercent, locale),
      thirtyDayPnl: pnlMetric(thirtyDayPnl.changeAbsolute, code, thirtyDayPnl.changePercent, locale),
      positionCount: summary?.activeInvestmentCount ?? 0,
      tradeCount: activity.totalTrades,
    },
    timeline: {
      hasData: daily.length >= 2,
      points: daily.map((d) => ({ date: d.date, accountValue: d.accountValue, dailyPnL: d.dailyPnL })),
      bestDayLabel: dayPnlLabel(insights.bestDay, code, locale),
      worstDayLabel: dayPnlLabel(insights.worstDay, code, locale),
      averageDailyLabel: insights.averageDailyChange !== null ? signedCurrency(insights.averageDailyChange, code, locale) : null,
      winLossLabel: insights.winDays + insights.lossDays > 0 ? `${insights.winDays} up · ${insights.lossDays} down` : null,
      estimatedNote:
        'Daily account values come from recorded simulation snapshots. Days without simulated activity may be absent.',
    },
    moneyflow: {
      hasData: hasTrades,
      startingCapitalLabel: currency(moneyflow.startingCapital ?? summary?.initialCashBalance ?? null, code, locale),
      buyVolumeLabel: currency(moneyflow.totalBuyVolume, code, locale),
      sellVolumeLabel: currency(moneyflow.totalSellVolume, code, locale),
      netInvestedLabel: currency(moneyflow.netInvested, code, locale),
      realizedPnl: pnlMetric(moneyflow.realizedPnl, code, undefined, locale),
      feesLabel: currency(moneyflow.totalFees, code, locale),
      largestInflowLabel: moneyflow.largestInflow
        ? `${moneyflow.largestInflow.symbol ?? '—'} · ${currency(moneyflow.largestInflow.amount, code, locale)}`
        : null,
      largestOutflowLabel: moneyflow.largestOutflow
        ? `${moneyflow.largestOutflow.symbol ?? '—'} · ${currency(moneyflow.largestOutflow.amount, code, locale)}`
        : null,
      assetFlows: moneyflow.assetFlows.slice(0, 6).map((flow) => ({
        symbol: flow.symbol,
        buyLabel: currency(flow.buyVolume, code, locale),
        sellLabel: currency(flow.sellVolume, code, locale),
        realizedPnl: pnlMetric(flow.realizedPnl, code, undefined, locale),
        tradeCount: flow.tradeCount,
      })),
    },
    activity: {
      totalTrades: activity.totalTrades,
      buyCount: activity.buyCount,
      sellCount: activity.sellCount,
      buySellRatioLabel: activity.sellCount > 0 ? `${(activity.buyCount / activity.sellCount).toFixed(2)} : 1` : `${activity.buyCount} : 0`,
      activeDays: activity.activeDays,
      averageTradeSizeLabel: currency(activity.averageTradeSize, code, locale),
      journalEntryCount: activity.journalEntryCount,
      watchlistCount: watchlist.length,
      mostTradedSymbols: activity.mostTradedSymbols,
    },
    insights: {
      reviewSuggestions: insights.reviewSuggestions,
      bestAssetLabel: insights.bestAsset ? `${insights.bestAsset.symbol} · ${signedCurrency(insights.bestAsset.realizedPnl, code, locale)}` : null,
      worstAssetLabel: insights.worstAsset ? `${insights.worstAsset.symbol} · ${signedCurrency(insights.worstAsset.realizedPnl, code, locale)}` : null,
    },
    assetContributions: {
      hasData: contributionItems.length > 0,
      maxAbsolute: maxAbsContribution,
      items: contributionItems.map((c) => ({
        symbol: c.symbol,
        realizedPnl: c.realizedPnl,
        label: signedCurrency(c.realizedPnl, code, locale),
        tone: toneOf(c.realizedPnl),
      })),
    },
    risk: {
      hasPositions: concentration.positionCount > 0,
      concentrationLevel: concentration.level,
      largestPositionLabel:
        concentration.largestSymbol !== null && concentration.largestWeight !== null
          ? `${concentration.largestSymbol} · ${Math.round(concentration.largestWeight * 100)}%`
          : null,
      topThreeWeightLabel: concentration.topThreeWeight !== null ? `${Math.round(concentration.topThreeWeight * 100)}%` : null,
      cashDeploymentLabel: `${Math.round(cashDeploymentRatio * 100)}%`,
      cashDeploymentRatio,
      journalCoverageLabel: journalCoverage !== null ? `${Math.round(journalCoverage * 100)}%` : '—',
      bestUnrealizedLabel: concentration.bestUnrealized
        ? `${concentration.bestUnrealized.symbol} · ${signedCurrency(concentration.bestUnrealized.unrealizedPnl, code, locale)}`
        : null,
      worstUnrealizedLabel: concentration.worstUnrealized
        ? `${concentration.worstUnrealized.symbol} · ${signedCurrency(concentration.worstUnrealized.unrealizedPnl, code, locale)}`
        : null,
      warnings: riskWarnings,
    },
    recentActions,
  };
}
