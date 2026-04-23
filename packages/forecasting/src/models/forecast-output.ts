export interface ForecastOutput {
  directionalBias: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number;
}
