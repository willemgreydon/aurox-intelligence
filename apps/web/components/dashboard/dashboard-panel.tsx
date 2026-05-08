import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '../ui/card';

export function DashboardPanel({
  eyebrow,
  title,
  description,
  href,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <Card className="dashboard-exec-panel">
      <header className="dashboard-exec-panel__header">
        <div>
          <div className="section__eyebrow">{eyebrow}</div>
          <h3>{title}</h3>
          {description ? <p className="text-muted">{description}</p> : null}
        </div>
        {href ? <Link href={href} className="dashboard-exec-panel__link">Open</Link> : null}
      </header>
      <div className="dashboard-exec-panel__body">{children}</div>
    </Card>
  );
}
