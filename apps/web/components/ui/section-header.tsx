import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type SectionHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  /** Optional trailing action (e.g. a "View all" link or toggle). */
  action?: ReactNode;
  /** Heading level for correct document outline. Defaults to h2. */
  as?: 'h2' | 'h3';
  className?: string;
};

/**
 * Consistent section heading: eyebrow + title + description + optional action.
 *
 * Pure presentational server component that reuses the existing
 * .section__header / .section__eyebrow / .section__title / .section__description
 * design classes, so it matches every section already in the app. Use it to stop
 * hand-rolling the same header markup on every dense page.
 */
export function SectionHeader({
  title,
  eyebrow,
  description,
  action,
  as = 'h2',
  className,
}: SectionHeaderProps) {
  const Heading = as;
  return (
    <div className={cn('section__header', action ? 'section__header--with-action' : null, className)}>
      <div className="section__header-text">
        {eyebrow ? <div className="section__eyebrow">{eyebrow}</div> : null}
        <Heading className="section__title">{title}</Heading>
        {description ? <p className="section__description">{description}</p> : null}
      </div>
      {action ? <div className="section__header-action">{action}</div> : null}
    </div>
  );
}
