import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'ghost';
};

export function Card({ children, className, tone = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'surface',
        tone === 'accent' && 'surface--accent',
        tone === 'ghost' && 'surface--ghost',
        className,
      )}
      {...props}
    >
      <div className="surface__inner">{children}</div>
    </div>
  );
}
