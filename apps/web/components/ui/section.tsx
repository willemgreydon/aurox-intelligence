import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type SectionProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  /** Optional anchor id for in-page section navigation (e.g. sticky section nav). */
  id?: string;
};

export function Section({ children, className, containerClassName, id }: SectionProps) {
  return (
    <section id={id} className={cn('section', className)} style={id ? { scrollMarginTop: 'calc(var(--header-height, 3.5rem) + 3.5rem)' } : undefined}>
      <div className={cn('shell-container', containerClassName)}>{children}</div>
    </section>
  );
}
