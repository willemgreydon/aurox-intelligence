export type SparkPoint = {
  label: string;
  value: number;
};

export type SeriesPoint = {
  label: string;
  primary: number;
  benchmark?: number;
  lower?: number;
  upper?: number;
};

export type HeatmapCell = {
  label: string;
  value: number;
};

export type HeatmapRow = {
  label: string;
  cells: HeatmapCell[];
};

export type DistributionBucket = {
  label: string;
  value: number;
};

export type ComparisonBar = {
  label: string;
  value: number;
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
};

export type ScenarioSplit = {
  label: string;
  value: number;
  tone: 'positive' | 'negative' | 'neutral';
};

export type TableColumn<T> = {
  key: keyof T;
  label: string;
  align?: 'left' | 'right';
};

export type ForecastTableRow = {
  asset: string;
  horizon: string;
  bias: string;
  confidence: string;
  freshness: string;
};

export type ProviderTableRow = {
  provider: string;
  status: string;
  lastSync: string;
  note: string;
};

export const marketTrendSeries: SeriesPoint[] = [
  { label: 'Mon', primary: 41, benchmark: 37, lower: 31, upper: 48 },
  { label: 'Tue', primary: 44, benchmark: 38, lower: 33, upper: 50 },
  { label: 'Wed', primary: 43, benchmark: 39, lower: 34, upper: 49 },
  { label: 'Thu', primary: 49, benchmark: 41, lower: 36, upper: 55 },
  { label: 'Fri', primary: 53, benchmark: 42, lower: 39, upper: 58 },
  { label: 'Mon+', primary: 56, benchmark: 44, lower: 41, upper: 61 },
];

export const confidenceDistribution: DistributionBucket[] = [
  { label: '<40', value: 6 },
  { label: '40-50', value: 11 },
  { label: '50-60', value: 18 },
  { label: '60-70', value: 26 },
  { label: '70-80', value: 19 },
  { label: '80+', value: 8 },
];

export const relativePerformance: ComparisonBar[] = [
  { label: 'Growth tech', value: 14, tone: 'positive' },
  { label: 'Quality', value: 9, tone: 'positive' },
  { label: 'FX carry', value: 5, tone: 'neutral' },
  { label: 'Rates beta', value: -4, tone: 'warning' },
  { label: 'Cyclicals', value: -9, tone: 'negative' },
];

export const correlationHeatmap: HeatmapRow[] = [
  {
    label: 'AAPL',
    cells: [
      { label: 'AAPL', value: 1 },
      { label: 'MSFT', value: 0.81 },
      { label: 'NVDA', value: 0.76 },
      { label: 'EUR/USD', value: -0.18 },
    ],
  },
  {
    label: 'MSFT',
    cells: [
      { label: 'AAPL', value: 0.81 },
      { label: 'MSFT', value: 1 },
      { label: 'NVDA', value: 0.72 },
      { label: 'EUR/USD', value: -0.09 },
    ],
  },
  {
    label: 'NVDA',
    cells: [
      { label: 'AAPL', value: 0.76 },
      { label: 'MSFT', value: 0.72 },
      { label: 'NVDA', value: 1 },
      { label: 'EUR/USD', value: -0.12 },
    ],
  },
  {
    label: 'EUR/USD',
    cells: [
      { label: 'AAPL', value: -0.18 },
      { label: 'MSFT', value: -0.09 },
      { label: 'NVDA', value: -0.12 },
      { label: 'EUR/USD', value: 1 },
    ],
  },
];

export const shortHorizonSpark: SparkPoint[] = [
  { label: '1', value: 14 },
  { label: '2', value: 16 },
  { label: '3', value: 15 },
  { label: '4', value: 19 },
  { label: '5', value: 22 },
  { label: '6', value: 21 },
  { label: '7', value: 24 },
];

export const scenarioSplit: ScenarioSplit[] = [
  { label: 'Bullish', value: 48, tone: 'positive' },
  { label: 'Base', value: 34, tone: 'neutral' },
  { label: 'Bearish', value: 18, tone: 'negative' },
];

export const forecastTableColumns: Array<TableColumn<ForecastTableRow>> = [
  { key: 'asset', label: 'Asset' },
  { key: 'horizon', label: 'Horizon' },
  { key: 'bias', label: 'Bias' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'freshness', label: 'Freshness', align: 'right' },
];

export const providerTableColumns: Array<TableColumn<ProviderTableRow>> = [
  { key: 'provider', label: 'Provider' },
  { key: 'status', label: 'Status' },
  { key: 'lastSync', label: 'Last sync' },
  { key: 'note', label: 'Note' },
];
