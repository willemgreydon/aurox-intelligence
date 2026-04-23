'use client';

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type StatePanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  tone?: 'neutral' | 'subtle' | 'danger';
  actions?: ReactNode;
  className?: string;
};

export function StatePanel({
  eyebrow,
  title,
  description,
  tone = 'neutral',
  actions,
  className,
}: StatePanelProps) {
  return (
    <section className={cn('state-panel', `state-panel--${tone}`, className)}>
      <div className="state-panel__body">
        {eyebrow ? <div className="state-panel__eyebrow">{eyebrow}</div> : null}
        <h2 className="state-panel__title">{title}</h2>
        <p className="state-panel__description">{description}</p>
      </div>
      {actions ? <div className="state-panel__actions">{actions}</div> : null}
    </section>
  );
}