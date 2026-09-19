import type { ClaudeFinanceCockpitViewModel } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';
import { Disclosure } from '../ui/disclosure';

type IntelligenceSnapshotProps = {
  intelligence: ClaudeFinanceCockpitViewModel['intelligence'];
  status: ClaudeFinanceCockpitViewModel['status'];
  statusReason: string;
  labels: AppMessages['finance']['snapshot'];
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
export function IntelligenceSnapshot({ intelligence, status, statusReason, labels }: IntelligenceSnapshotProps) {
  return (
    <div className="finance-snapshot">
      {status !== 'nominal' ? (
        <p className="finance-snapshot__status" role="status">
          {status === 'empty' ? labels.warming : labels.degraded} {statusReason}
        </p>
      ) : null}

      <dl className="finance-snapshot__metrics">
        <div className="finance-snapshot__metric">
          <dt>{labels.allocationHealth}</dt>
          <dd>
            <span className={`finance-pill ${healthTone[intelligence.healthLabel] ?? 'finance-pill--neutral'}`}>
              {intelligence.healthLabel.replace('-', ' ')}
            </span>
          </dd>
        </div>
        <div className="finance-snapshot__metric">
          <dt>{labels.avgConfidence}</dt>
          <dd className="finance-snapshot__value">{intelligence.averageConfidenceLabel}</dd>
        </div>
        <div className="finance-snapshot__metric">
          <dt>{labels.avgRisk}</dt>
          <dd className="finance-snapshot__value">{intelligence.averageRiskLabel}</dd>
        </div>
        <div className="finance-snapshot__metric">
          <dt>{labels.marketRegime}</dt>
          <dd className="finance-snapshot__value">{intelligence.regimeLabel}</dd>
        </div>
      </dl>

      <Disclosure summary={labels.opportunities} hint={`${intelligence.topOpportunities.length}`} defaultOpen>
        {intelligence.topOpportunities.length === 0 ? (
          <p className="finance-snapshot__empty">{labels.noOpportunities}</p>
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

      <Disclosure summary={labels.assetsToWatch} hint={`${intelligence.assetsToWatch.length}`}>
        {intelligence.assetsToWatch.length === 0 ? (
          <p className="finance-snapshot__empty">{labels.nothingToWatch}</p>
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

      <Disclosure summary={labels.howDerived}>
        <p className="finance-snapshot__explanation">{intelligence.explanation}</p>
      </Disclosure>
    </div>
  );
}
