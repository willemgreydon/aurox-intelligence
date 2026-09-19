import Link from 'next/link';
import { DashboardPanel } from './dashboard-panel';
import type { AppMessages } from '../../lib/i18n/messages';
import type { DashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export function DashboardAssetClassSnapshot({ model, messages }: { model: DashboardExecutiveViewModel; messages: AppMessages }) {
  const t = messages.dashboard.panels;
  return (
    <DashboardPanel eyebrow={t.assetsEyebrow} title={t.assetsTitle} description={t.assetsDescription}>
      <div className="dashboard-exec-list">
        {model.assetClassSnapshot.length === 0 ? <p className="text-muted">{t.assetsEmpty}</p> : model.assetClassSnapshot.map((row) => (
          <article key={row.assetClass} className="dashboard-exec-list__item">
            <strong>{row.assetClass.toUpperCase()}</strong>
            <span>
              <span className="num-bubble num-bubble--info num-bubble--small" aria-label={`${row.count} assets`}>{row.count}</span> {t.assetsSuffix}
            </span>
            <span className="text-muted">{row.avgConfidence}</span>
            <Link href={row.href}>{t.openLane}</Link>
          </article>
        ))}
      </div>
    </DashboardPanel>
  );
}
