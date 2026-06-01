import type { ReactNode } from 'react';

type DashboardGroupProps = {
  /** Group heading, e.g. "Portfolio Overview". */
  title: string;
  /** Optional one-line context under the heading. */
  subtitle?: string;
  children: ReactNode;
  /**
   * Lead layout: a wider primary panel (1.5fr) beside a supporting panel (1fr),
   * collapsing to one column on narrow viewports. Default is an even auto-fit grid.
   */
  lead?: boolean;
};

/**
 * Named dashboard overview group — gives the executive dashboard clear
 * information architecture: a heading, optional subheading, consistent
 * spacing, and a visual separator between groups (see .dashboard-group CSS).
 */
export function DashboardGroup({ title, subtitle, children, lead = false }: DashboardGroupProps) {
  return (
    <section className="dashboard-group" aria-label={title}>
      <header className="dashboard-group__head">
        <h2 className="dashboard-group__title">{title}</h2>
        {subtitle ? <p className="dashboard-group__subtitle">{subtitle}</p> : null}
      </header>
      <div className={`dashboard-group__grid${lead ? ' dashboard-group__grid--lead' : ''}`}>{children}</div>
    </section>
  );
}
