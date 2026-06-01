import type { ClaudeFinanceCockpitViewModel } from '@repo/api-contracts';
import { Disclosure } from '../ui/disclosure';

type IntelligenceSnapshotProps = {
  intelligence: ClaudeFinanceCockpitViewModel['intelligence'];
  status: ClaudeFinanceCockpitViewModel['status'];
  statusReason: string;
};

const healthTone: Record<string, string> = {
  healthy: 'finance-pill--positive',
  concentrated: 'finance-pill--warning',
  'high-risk': 'finance-pill--negative',
  'insufficient-data': 'finance-pill--neutral',
};

/**
 * Summary-first portfolio intelligence. Headline metrics are always visible;
 * opportunity/watch lists and the methodology explanation are progressively
 * disclosed. Degraded/empty states are explicit.
 */
export function IntelligenceSnapshot({ intelligence, status, statusReason }: IntelligenceSnapshotProps) {
  return (
    <div className="finance-snapshot">
      {status !== 'nominal' ? (
        <p className="finance-snapshot__status" role="status">
          {status === 'empty' ? 'Intelligence is warming up.' : 'Some market data is degraded.'} {statusReason}
        </p>
      ) : null}

      <dl className="finance-snapshot__metrics">
        <div className="finance-snapshot__metric">
          <dt>Allocation health</dt>
          <dd>
            <span className={`finance-pill ${healthTone[intelligence.healthLabel] ?? 'finance-pill--neutral'}`}>
              {intelligence.healthLabel.replace('-', ' ')}
            </span>
          </dd>
        </div>
        <div className="finance-snapshot__metric">
          <dt>Avg confidence</dt>
          <dd className="finance-snapshot__value">{intelligence.averageConfidenceLabel}</dd>
        </div>
        <div className="finance-snapshot__metric">
          <dt>Avg risk</dt>
          <dd className="finance-snapshot__value">{intelligence.averageRiskLabel}</dd>
        </div>
        <div className="finance-snapshot__metric">
          <dt>Market regime</dt>
          <dd className="finance-snapshot__value">{intelligence.regimeLabel}</dd>
        </div>
      </dl>

      <Disclosure summary="Strongest opportunities" hint={`${intelligence.topOpportunities.length}`} defaultOpen>
        {intelligence.topOpportunities.length === 0 ? (
          <p className="finance-snapshot__empty">No buy-leaning opportunities right now.</p>
        ) : (
          <ul className="finance-insight-list">
            {intelligence.topOpportunities.map((item) => (
              <li key={`opp-${item.symbol}`}>
                <span className="finance-insight-list__symbol">{item.symbol}</span>
                <span className="finance-insight-list__action finance-insight-list__action--positive">{item.action}</span>
                <span className="finance-insight-list__reason">{item.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Disclosure>

      <Disclosure summary="Assets to watch" hint={`${intelligence.assetsToWatch.length}`}>
        {intelligence.assetsToWatch.length === 0 ? (
          <p className="finance-snapshot__empty">Nothing flagged to watch right now.</p>
        ) : (
          <ul className="finance-insight-list">
            {intelligence.assetsToWatch.map((item) => (
              <li key={`watch-${item.symbol}`}>
                <span className="finance-insight-list__symbol">{item.symbol}</span>
                <span className="finance-insight-list__action">{item.action}</span>
                <span className="finance-insight-list__reason">{item.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Disclosure>

      <Disclosure summary="How this is derived">
        <p className="finance-snapshot__explanation">{intelligence.explanation}</p>
      </Disclosure>
    </div>
  );
}
