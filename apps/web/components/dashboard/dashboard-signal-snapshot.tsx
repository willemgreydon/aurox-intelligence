import { DashboardPanel } from './dashboard-panel';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardSignalSnapshot({ model }: { model: DashboardExecutiveViewModel }) {
  return (
    <DashboardPanel eyebrow="Signals Snapshot" title="Signal action distribution" description="BUY/SELL/HOLD composition and confidence." href="/signals">
      <div className="dashboard-exec-list">
        <article className="dashboard-exec-list__item"><strong>BUY</strong><span>{model.signalSnapshot.buy}</span></article>
        <article className="dashboard-exec-list__item"><strong>SELL</strong><span>{model.signalSnapshot.sell}</span></article>
        <article className="dashboard-exec-list__item"><strong>HOLD</strong><span>{model.signalSnapshot.hold}</span></article>
        <article className="dashboard-exec-list__item"><strong>Avg confidence</strong><span>{model.signalSnapshot.avgConfidence}</span></article>
      </div>
    </DashboardPanel>
  );
}
