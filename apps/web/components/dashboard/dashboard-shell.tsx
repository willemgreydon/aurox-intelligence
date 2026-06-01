import type { ReactNode } from 'react';

export function DashboardShell({
  hero,
  kpis,
  topBand,
  body,
  ctas,
}: {
  hero: ReactNode;
  kpis: ReactNode;
  /** Optional Mission Control band (account/simulation intelligence) shown above the executive groups. */
  topBand?: ReactNode;
  /** The grouped executive content (a stack of <DashboardGroup>). */
  body: ReactNode;
  ctas: ReactNode;
}) {
  // Every band is wrapped in `.dashboard-page-container` so content is centered
  // within a max-width column with responsive side gutters — nothing touches the
  // viewport edges. The executive content is grouped into named overviews
  // (Portfolio / Risk / Market / AI / Research) for clear information hierarchy.
  return (
    <>
      <div className="dashboard-page-container">{hero}</div>
      <div className="dashboard-page-container">{kpis}</div>
      {topBand ? <div className="dashboard-page-container">{topBand}</div> : null}
      <section className="dashboard-section dashboard-section--compact">
        <div className="dashboard-page-container dashboard-groups">{body}</div>
      </section>
      <section className="dashboard-section dashboard-section--compact">
        <div className="dashboard-page-container">{ctas}</div>
      </section>
    </>
  );
}
