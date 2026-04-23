import type { ChartType, DashboardModuleId, TimePeriod } from '@repo/api-contracts';

export const availableChartTypes: ChartType[] = ['trend', 'stock', 'comparison', 'bar', 'donut'];
export const availableTimePeriods: TimePeriod[] = ['1s', '3s', '5s', '10s', '1m', '1h', '1d', '1w', '1mo', '1y', '2y', '5y'];
export const availableDashboardModules: DashboardModuleId[] = [
  'market-overview',
  'watchlist',
  'forecast-analysis',
  'broker-tools',
  'system-observation',
];

export function resolveChartType(value: string | null | undefined, fallback: ChartType): ChartType {
  return availableChartTypes.find((item) => item === value) ?? fallback;
}

export function resolveTimePeriod(value: string | null | undefined, fallback: TimePeriod): TimePeriod {
  return availableTimePeriods.find((item) => item === value) ?? fallback;
}

export function slicePointsByTimePeriod<T>(items: T[], timePeriod: TimePeriod): T[] {
  const windowSizes: Record<TimePeriod, number> = {
    '1s': 1,
    '3s': 3,
    '5s': 5,
    '10s': 10,
    '1m': 12,
    '1h': 18,
    '1d': 24,
    '1w': 7,
    '1mo': 30,
    '1y': 52,
    '2y': 104,
    '5y': 260,
  };

  const windowSize = windowSizes[timePeriod];
  return items.slice(-windowSize);
}
