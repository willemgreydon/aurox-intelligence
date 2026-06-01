/**
 * Next Best Actions — pure, deterministic derivation of "what to do next" from
 * the account's real simulation state. No fabricated data: every action is
 * gated on an observable condition. Actions use review/simulate/document/inspect
 * language (never advisory). Returned in priority order, capped by the caller.
 */

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

export function computeNextBestActions(input: NextActionInput): NextAction[] {
  const actions: NextAction[] = [];

  if (!input.hasTrades) {
    actions.push({
      id: 'first-trade',
      title: 'Make your first paper trade',
      detail: 'Your simulation account is ready. Start building a performance history.',
      ctaLabel: 'Open simulation',
      href: '/invest/simulation',
      tone: 'primary',
      priority: 0,
    });
  }

  if (input.staleData) {
    actions.push({
      id: 'stale-data',
      title: 'Check data freshness',
      detail: 'Some valuations may rely on delayed or cached quotes. Review data quality before acting.',
      ctaLabel: 'Market overview',
      href: '/invest',
      tone: 'review',
      priority: 1,
    });
  }

  if (input.concentrationLevel === 'high') {
    actions.push({
      id: 'concentration',
      title: 'Review concentration risk',
      detail: input.largestPositionLabel
        ? `Your largest simulated exposure is ${input.largestPositionLabel}. Review position weight.`
        : 'Your simulated positions are concentrated. Review exposure before adding more.',
      ctaLabel: 'Portfolio intelligence',
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
      title: 'Document your recent decisions',
      detail: 'Several paper trades have no journal rationale yet. Documenting improves review quality.',
      ctaLabel: 'Open journal',
      href: '/invest/simulation?tab=journal',
      tone: 'review',
      priority: 3,
    });
  }

  if (input.cashDeploymentRatio > 0.85 && input.openPositions > 0) {
    actions.push({
      id: 'cash-deployment',
      title: 'Review cash deployment',
      detail: 'Most simulated capital is invested. Consider reviewing concentration and reserves.',
      ctaLabel: 'Account overview',
      href: '/account',
      tone: 'review',
      priority: 4,
    });
  }

  if (input.watchlistCount > 0) {
    actions.push({
      id: 'review-watchlist',
      title: 'Review your starred assets',
      detail: `You have ${input.watchlistCount} asset${input.watchlistCount === 1 ? '' : 's'} on your watchlist. Inspect and compare.`,
      ctaLabel: 'Claude Finance',
      href: '/finance',
      tone: 'info',
      priority: 5,
    });
  }

  if (input.hasTrades && actions.length === 0) {
    actions.push({
      id: 'review-performance',
      title: 'Review your simulated performance',
      detail: 'Inspect your daily timeline, moneyflow, and recent decisions.',
      ctaLabel: 'Account overview',
      href: '/account',
      tone: 'info',
      priority: 6,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
