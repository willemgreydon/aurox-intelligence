import type { LiveReadinessResult } from '@repo/agents';
import { Card } from '../ui/card';

type Props = {
  result: LiveReadinessResult;
  tier: number;
};

function getTone(result: LiveReadinessResult): 'success' | 'warning' | 'danger' | 'info' {
  if (result.ready) return 'success';
  if (result.executionTarget === 'live') return 'danger';
  if (result.blockingCheckCount > 0) return 'warning';
  return 'info';
}

function getCheckTone(check: LiveReadinessResult['checks'][number]): 'success' | 'warning' | 'danger' | 'info' {
  if (check.passed) return 'success';
  if (check.severity === 'critical') return 'danger';
  if (check.severity === 'warning') return 'warning';
  return 'info';
}

export function LiveReadinessCard({ result, tier }: Props) {
  const statusTone = getTone(result);
  const statusLabel = result.ready ? 'Ready' : 'Not ready';

  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">
            Mode {tier} · {result.executionTarget}
          </div>
          <h3>{result.modeLabel}</h3>
          <p>
            Activation readiness for this broker mode.{' '}
            {result.ready
              ? 'All checks passed.'
              : `${result.blockingCheckCount} blocking check${result.blockingCheckCount === 1 ? '' : 's'} remaining.`}
          </p>
        </div>
        <span className={`status-pill status-pill--${statusTone}`}>{statusLabel}</span>
      </div>

      <div className="analytics-card__body">
        <ul style={{ display: 'grid', gap: '0.875rem', margin: 0, paddingLeft: '1rem' }}>
          {result.checks.map((check) => {
            const tone = getCheckTone(check);

            return (
              <li key={check.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                  <span className={`status-pill status-pill--${tone}`} aria-hidden="true">
                    {check.passed ? '✓' : tone === 'danger' ? '!' : '·'}
                  </span>
                  <strong>{check.label}</strong>
                </div>
                <div style={{ marginTop: '0.35rem', opacity: 0.9 }}>{check.reason}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}