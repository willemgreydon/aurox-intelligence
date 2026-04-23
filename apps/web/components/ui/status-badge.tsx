import { cn } from '../../lib/utils';

type StatusTone = 'success' | 'warning' | 'danger' | 'info';

type StatusBadgeProps = {
  tone: StatusTone;
  children: string;
};

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={cn('status-pill', `status-pill--${tone}`)}>{children}</span>;
}
