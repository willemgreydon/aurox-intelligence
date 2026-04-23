export function signalScore(input: number): 'bullish' | 'bearish' | 'neutral' {
  if (input > 0) return 'bullish';
  if (input < 0) return 'bearish';
  return 'neutral';
}
