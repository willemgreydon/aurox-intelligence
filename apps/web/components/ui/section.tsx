import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type SectionProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
};

export function Section({ children, className, containerClassName }: SectionProps) {
  return (
    <section className={cn('section', className)}>
      <div className={cn('shell-container', containerClassName)}>{children}</div>
    </section>
  );
}
