/**
 * Next Best Actions — pure, deterministic derivation of "what to do next" from
 * the account's real simulation state. No fabricated data: every action is
 * gated on an observable condition. Actions use review/simulate/document/inspect
 * language (never advisory). Returned in priority order, capped by the caller.
 */

import type { AppMessages } from './i18n/messages';

export type NextActionInput = {
  hasTrades: boolean;
  totalTrades: number;
  journalCoverageRatio: number | null; // 0..1, null when no trades
  concentrationLevel: 'low' | 'moderate' | 'high' | 'unknown';
  largestPositionLabel: string | null;
  cashDeploymentRatio: number; // 0..1
  watchlistCount: number;
  staleData: boolean;
  openPositions: number;
};

export type NextAction = {
  id: string;
  title: string;
  detail: string;
  ctaLabel: string;
  href: string;
  tone: 'primary' | 'review' | 'info';
  priority: number; // lower = higher priority
};

export function computeNextBestActions(input: NextActionInput, messages: AppMessages): NextAction[] {
  const t = messages.dashboard.nextActions;
  const actions: NextAction[] = [];

  if (!input.hasTrades) {
    actions.push({
      id: 'first-trade',
      title: t.firstTradeTitle,
      detail: t.firstTradeDetail,
      ctaLabel: t.firstTradeCta,
      href: '/invest/simulation',
      tone: 'primary',
      priority: 0,
    });
  }

  if (input.staleData) {
    actions.push({
      id: 'stale-data',
      title: t.staleTitle,
      detail: t.staleDetail,
      ctaLabel: t.staleCta,
      href: '/invest',
      tone: 'review',
      priority: 1,
    });
  }

  if (input.concentrationLevel === 'high') {
    actions.push({
      id: 'concentration',
      title: t.concentrationTitle,
      detail: input.largestPositionLabel
        ? t.concentrationDetail.replace('{{position}}', input.largestPositionLabel)
        : t.concentrationDetailFallback,
      ctaLabel: t.concentrationCta,
      href: '/portfolio/intelligence',
      tone: 'review',
      priority: 2,
    });
  }

  if (
    input.hasTrades &&
    input.totalTrades >= 3 &&
    input.journalCoverageRatio !== null &&
    input.journalCoverageRatio < 0.5
  ) {
    actions.push({
      id: 'journal-coverage',
      title: t.journalTitle,
      detail: t.journalDetail,
      ctaLabel: t.journalCta,
      href: '/invest/simulation?tab=journal',
      tone: 'review',
      priority: 3,
    });
  }

  if (input.cashDeploymentRatio > 0.85 && input.openPositions > 0) {
    actions.push({
      id: 'cash-deployment',
      title: t.cashTitle,
      detail: t.cashDetail,
      ctaLabel: t.cashCta,
      href: '/account',
      tone: 'review',
      priority: 4,
    });
  }

  if (input.watchlistCount > 0) {
    const detailTemplate = input.watchlistCount === 1 ? t.watchlistDetailOne : t.watchlistDetailMany;
    actions.push({
      id: 'review-watchlist',
      title: t.watchlistTitle,
      detail: detailTemplate.replace('{{count}}', String(input.watchlistCount)),
      ctaLabel: t.watchlistCta,
      href: '/finance',
      tone: 'info',
      priority: 5,
    });
  }

  if (input.hasTrades && actions.length === 0) {
    actions.push({
      id: 'review-performance',
      title: t.performanceTitle,
      detail: t.performanceDetail,
      ctaLabel: t.performanceCta,
      href: '/account',
      tone: 'info',
      priority: 6,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
