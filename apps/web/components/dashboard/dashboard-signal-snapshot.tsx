import { DashboardPanel } from './dashboard-panel';
import type { AppMessages } from '../../lib/i18n/messages';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardSignalSnapshot({ model, messages }: { model: DashboardExecutiveViewModel; messages: AppMessages }) {
  const t = messages.dashboard.panels;
  return (
    <DashboardPanel eyebrow={t.signalsEyebrow} title={t.signalsTitle} description={t.signalsDescription} href="/signals">
      <div className="dashboard-exec-list">
        <article className="dashboard-exec-list__item"><strong>{t.buy}</strong><span className="num-bubble num-bubble--success num-bubble--small" aria-label={`${model.signalSnapshot.buy} buy signals`}>{model.signalSnapshot.buy}</span></article>
        <article className="dashboard-exec-list__item"><strong>{t.sell}</strong><span className="num-bubble num-bubble--danger num-bubble--small" aria-label={`${model.signalSnapshot.sell} sell signals`}>{model.signalSnapshot.sell}</span></article>
        <article className="dashboard-exec-list__item"><strong>{t.hold}</strong><span className="num-bubble num-bubble--neutral num-bubble--small" aria-label={`${model.signalSnapshot.hold} hold signals`}>{model.signalSnapshot.hold}</span></article>
        <article className="dashboard-exec-list__item"><strong>{t.avgConfidence}</strong><span>{model.signalSnapshot.avgConfidence}</span></article>
      </div>
    </DashboardPanel>
  );
}
