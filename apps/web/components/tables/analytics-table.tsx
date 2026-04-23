import { cn } from '../../lib/utils';
import type { TableColumn } from '../../lib/dashboard/analytics-fixtures';
import { StatePanel } from '../ui/state-panel';

type AnalyticsTableProps<T extends Record<string, string>> = {
  title: string;
  subtitle: string;
  columns: Array<TableColumn<T>>;
  rows: T[];
  emptyMessage: string;
  rowDetailsLabel?: string;
};

export function AnalyticsTable<T extends Record<string, string>>({
  title,
  subtitle,
  columns,
  rows,
  emptyMessage,
  rowDetailsLabel = 'Details',
}: AnalyticsTableProps<T>) {
  return (
    <article className="surface table-panel">
      <div className="surface__inner">
        <header className="chart-panel__header">
          <div>
            <h3 className="chart-panel__title">{title}</h3>
            <p className="chart-panel__subtitle">{subtitle}</p>
          </div>
        </header>
        {rows.length > 0 ? (
          <>
            <div className="analytics-table-mobile">
              {rows.map((row, rowIndex) => (
                <article key={rowIndex} className="analytics-table-mobile__row">
                  <div className="analytics-table-mobile__title">{rowDetailsLabel} {rowIndex + 1}</div>
                  {columns.map((column) => (
                    <div key={String(column.key)} className="analytics-table-mobile__cell">
                      <span>{column.label}</span>
                      <strong className={cn(column.align === 'right' && 'analytics-table__cell--right')}>{row[column.key]}</strong>
                    </div>
                  ))}
                </article>
              ))}
            </div>
            <div className="analytics-table__scroll" role="region" aria-label={title}>
              <table className="analytics-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={String(column.key)} className={cn(column.align === 'right' && 'analytics-table__cell--right')}>
                        <button type="button" className="analytics-table__sort">
                          {column.label}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((column) => (
                        <td key={String(column.key)} className={cn(column.align === 'right' && 'analytics-table__cell--right')}>
                          {row[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <StatePanel
            title={title}
            description={emptyMessage}
            tone="subtle"
            className="table-panel__empty"
          />
        )}
      </div>
    </article>
  );
}
