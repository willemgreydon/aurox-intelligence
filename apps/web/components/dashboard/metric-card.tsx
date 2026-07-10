import type { DashboardViewModel } from '../../server/mappers/dashboard-mapper';
import { StatusBadge } from '../ui/status-badge';

type MetricCardProps = {
  metric: DashboardViewModel['metrics'][number];
};

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className="metric-panel surface gt-hover-lift">
      <div className="surface__inner metric-panel__inner">
        <div className="metric-panel__header">
          <div className="metric-panel__label">{metric.label}</div>
          <StatusBadge tone={metric.statusTone}>{metric.tone}</StatusBadge>
        </div>
        <div className="metric-panel__value">{metric.value}</div>
        <p className="metric-panel__context">{metric.context}</p>
      </div>
    </article>
  );
}
