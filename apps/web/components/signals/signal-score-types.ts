export type SignalScoreLabel =
  | 'Strong Bearish'
  | 'Bearish'
  | 'Neutral'
  | 'Bullish'
  | 'Strong Bullish';

export type SignalVisualState = 'bullish' | 'neutral' | 'bearish' | 'insufficient-data';

export type SignalScorePresentation = {
  score: number;
  confidence: number;
  explanation: string;
  label: SignalScoreLabel;
  visualState: SignalVisualState;
};

