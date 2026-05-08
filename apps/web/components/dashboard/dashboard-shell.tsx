import type { ReactNode } from 'react';

export function DashboardShell({
  hero,
  kpis,
  main,
  lower,
  ctas,
}: {
  hero: ReactNode;
  kpis: ReactNode;
  main: ReactNode;
  lower: ReactNode;
  ctas: ReactNode;
}) {
  return (
    <>
      {hero}
      {kpis}
      <section className="dashboard-section dashboard-section--compact dashboard-exec-main-grid">{main}</section>
      <section className="dashboard-section dashboard-section--compact dashboard-exec-lower-grid">{lower}</section>
      <section className="dashboard-section dashboard-section--compact">{ctas}</section>
    </>
  );
}
