import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type ChartPanelProps = {
  title: string;
  subtitle: string;
  controls?: ReactNode;
  legend?: ReactNode;
  rail?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ChartPanel({ title, subtitle, controls, legend, rail, note, children, className }: ChartPanelProps) {
  return (
    <article className={cn('chart-panel surface', className)}>
      <div className="surface__inner chart-panel__inner">
        <header className="chart-panel__header">
          <div>
            <h3 className="chart-panel__title">{title}</h3>
            <p className="chart-panel__subtitle">{subtitle}</p>
          </div>
          {controls ? <div className="chart-panel__controls">{controls}</div> : null}
        </header>
        {legend ? <div className="chart-panel__legend">{legend}</div> : null}
        <div className="chart-panel__content">
          <div className="chart-panel__canvas">{children}</div>
          {rail ? <aside className="chart-panel__rail">{rail}</aside> : null}
        </div>
        {note ? <footer className="chart-panel__note">{note}</footer> : null}
      </div>
    </article>
  );
}
