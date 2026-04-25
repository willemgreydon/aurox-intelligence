export type MiniIndicatorChartModel = {
  points: number[];
  movingAveragePoints: number[];
  volatilityUpperBand: number[];
  volatilityLowerBand: number[];
  signalMarkerValue: number | null;
  signalScore: number | null;
  summary: string;
  hasInsufficientData: boolean;
};

