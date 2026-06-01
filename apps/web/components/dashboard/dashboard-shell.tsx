import type { ReactNode } from 'react';

export function DashboardShell({
  hero,
  kpis,
  topBand,
  main,
  lower,
  ctas,
}: {
  hero: ReactNode;
  kpis: ReactNode;
  /** Optional Mission Control band (account/simulation intelligence) shown above the executive grid. */
  topBand?: ReactNode;
  main: ReactNode;
  lower: ReactNode;
  ctas: ReactNode;
}) {
  // Every band is wrapped in `.dashboard-page-container` so content is centered
  // within a max-width column with responsive side gutters — nothing touches the
  // viewport edges. Grid bands keep their grid class on the inner container.
  return (
    <>
      <div className="dashboard-page-container">{hero}</div>
      <div className="dashboard-page-container">{kpis}</div>
      {topBand ? <div className="dashboard-page-container">{topBand}</div> : null}
      <section className="dashboard-section dashboard-section--compact">
        <div className="dashboard-page-container dashboard-exec-main-grid">{main}</div>
      </section>
      <section className="dashboard-section dashboard-section--compact">
        <div className="dashboard-page-container dashboard-exec-lower-grid">{lower}</div>
      </section>
      <section className="dashboard-section dashboard-section--compact">
        <div className="dashboard-page-container">{ctas}</div>
      </section>
    </>
  );
}
