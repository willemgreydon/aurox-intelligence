import type { ClaudeFinanceRecentDecision } from '@repo/api-contracts';

type RecentDecisionsProps = {
  decisions: ClaudeFinanceRecentDecision[];
  ariaLabel: string;
  emptyMessage: string;
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Compact, read-only list of previously saved Claude Finance decisions. */
export function RecentDecisions({ decisions, ariaLabel, emptyMessage }: RecentDecisionsProps) {
  if (decisions.length === 0) {
    return (
      <p className="finance-empty" role="status">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="finance-decision-list" aria-label={ariaLabel}>
      {decisions.map((decision) => (
        <li key={decision.id} className="finance-decision">
          <div className="finance-decision__head">
            <span className="finance-decision__symbol">{decision.symbol ?? '—'}</span>
            <span className="finance-decision__action">{decision.action}</span>
            <span className="finance-decision__time">{formatTimestamp(decision.createdAt)}</span>
          </div>
          <p className="finance-decision__summary">{decision.summary}</p>
          <p className="finance-decision__meta">
            <span>Confidence {decision.confidenceLabel}</span>
            <span>Notional {decision.notionalLabel}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
