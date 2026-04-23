import Link from 'next/link';
import type { DashboardViewModel } from '../../server/mappers/dashboard-mapper';
import { StatusBadge } from '../ui/status-badge';

type ModuleNavCardProps = {
  module: DashboardViewModel['modules'][number];
};

export function ModuleNavCard({ module }: ModuleNavCardProps) {
  return (
    <article className="module-panel surface">
      <div className="surface__inner module-panel__inner">
        <div className="module-panel__meta">
          <div className="module-panel__eyebrow">{module.ownerAreaLabel}</div>
          <StatusBadge tone={module.statusTone}>{module.statusLabel}</StatusBadge>
        </div>
        <h3 className="module-panel__title">{module.title}</h3>
        <p className="module-panel__description">{module.description}</p>
        <Link href={module.href} className="module-panel__link">
          Open surface
        </Link>
      </div>
    </article>
  );
}
