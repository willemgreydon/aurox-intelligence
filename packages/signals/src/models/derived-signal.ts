export interface DerivedSignal {
  name: string;
  value: number;
  interpretation: 'bullish' | 'bearish' | 'neutral';
}
