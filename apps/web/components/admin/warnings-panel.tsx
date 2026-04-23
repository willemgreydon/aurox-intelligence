import { StatusBadge } from '../ui/status-badge';

type WarningsPanelProps = {
  title: string;
  subtitle: string;
  warnings: Array<{
    id: string;
    title: string;
    detail: string;
    severityLabel: string;
    severityTone: 'success' | 'warning' | 'danger' | 'info';
  }>;
  emptyMessage: string;
};

export function WarningsPanel({ title, subtitle, warnings, emptyMessage }: WarningsPanelProps) {
  return (
    <article className="surface warning-panel">
      <div className="surface__inner warning-panel__inner">
        <header className="chart-panel__header">
          <div>
            <h3 className="chart-panel__title">{title}</h3>
            <p className="chart-panel__subtitle">{subtitle}</p>
          </div>
        </header>

        {warnings.length > 0 ? (
          <div className="warning-panel__list">
            {warnings.map((warning) => (
              <article key={warning.id} className="warning-panel__item">
                <div className="warning-panel__item-header">
                  <h4>{warning.title}</h4>
                  <StatusBadge tone={warning.severityTone}>{warning.severityLabel}</StatusBadge>
                </div>
                <p>{warning.detail}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="table-panel__empty">{emptyMessage}</div>
        )}
      </div>
    </article>
  );
}
