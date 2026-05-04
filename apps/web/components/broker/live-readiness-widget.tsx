import Link from 'next/link';
import { Card } from '../ui/card';

type LiveReadinessWidgetProps = {
  status: 'PASSED' | 'FAILED' | 'WARNING';
  whyLocked: string;
};

function tone(status: LiveReadinessWidgetProps['status']) {
  if (status === 'PASSED') return 'success';
  if (status === 'FAILED') return 'danger';
  return 'warning';
}

export function LiveReadinessWidget({ status, whyLocked }: LiveReadinessWidgetProps) {
  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Broker readiness</div>
          <h3>Live trade locked</h3>
          <p>Simulation mode active. No real orders are executed.</p>
        </div>
        <span className={`status-pill status-pill--${tone(status)}`}>{status}</span>
      </div>
      <div className="analytics-card__body">
        <p>{whyLocked}</p>
      </div>
      <div className="analytics-card__action-grid">
        <Link href="/admin/live-readiness" className="button button--secondary">Open readiness panel</Link>
      </div>
    </Card>
  );
}
