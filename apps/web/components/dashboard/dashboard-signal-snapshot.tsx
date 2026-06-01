import { DashboardPanel } from './dashboard-panel';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardSignalSnapshot({ model }: { model: DashboardExecutiveViewModel }) {
  return (
    <DashboardPanel eyebrow="Signals Snapshot" title="Signal action distribution" description="BUY/SELL/HOLD composition and confidence." href="/signals">
      <div className="dashboard-exec-list">
        <article className="dashboard-exec-list__item"><strong>BUY</strong><span className="num-bubble num-bubble--success num-bubble--small" aria-label={`${model.signalSnapshot.buy} buy signals`}>{model.signalSnapshot.buy}</span></article>
        <article className="dashboard-exec-list__item"><strong>SELL</strong><span className="num-bubble num-bubble--danger num-bubble--small" aria-label={`${model.signalSnapshot.sell} sell signals`}>{model.signalSnapshot.sell}</span></article>
        <article className="dashboard-exec-list__item"><strong>HOLD</strong><span className="num-bubble num-bubble--neutral num-bubble--small" aria-label={`${model.signalSnapshot.hold} hold signals`}>{model.signalSnapshot.hold}</span></article>
        <article className="dashboard-exec-list__item"><strong>Avg confidence</strong><span>{model.signalSnapshot.avgConfidence}</span></article>
      </div>
    </DashboardPanel>
  );
}
