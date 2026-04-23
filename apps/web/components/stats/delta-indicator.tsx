import { cn } from '../../lib/utils';

type DeltaIndicatorProps = {
  value: string;
  direction: 'up' | 'down' | 'flat';
  tone?: 'positive' | 'negative' | 'neutral';
};

export function DeltaIndicator({ value, direction, tone = 'neutral' }: DeltaIndicatorProps) {
  const glyph = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';

  return (
    <span className={cn('delta-indicator', `delta-indicator--${tone}`)}>
      <span aria-hidden="true">{glyph}</span>
      {value}
    </span>
  );
}
