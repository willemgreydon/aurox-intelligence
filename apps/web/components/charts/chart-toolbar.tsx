import Link from 'next/link';
import type { ChartType, TimePeriod } from '@repo/api-contracts';
import { availableChartTypes, availableTimePeriods } from '../../lib/workspace';

type ChartToolbarProps = {
  pathname: string;
  chartType: ChartType;
  timePeriod: TimePeriod;
  labels: {
    chartType: string;
    timePeriod: string;
  };
};

function buildHref(pathname: string, chartType: ChartType, timePeriod: TimePeriod) {
  return `${pathname}?chart=${encodeURIComponent(chartType)}&period=${encodeURIComponent(timePeriod)}`;
}

export function ChartToolbar({ pathname, chartType, timePeriod, labels }: ChartToolbarProps) {
  return (
    <div className="chart-toolbar">
      <div className="chart-toolbar__group" aria-label={labels.chartType}>
        <span className="chart-toolbar__label">{labels.chartType}</span>
        <div className="control-group">
          {availableChartTypes.map((option) => (
            <Link
              key={option}
              href={buildHref(pathname, option, timePeriod)}
              className={option === chartType ? 'control-pill control-pill--active' : 'control-pill'}
            >
              {option}
            </Link>
          ))}
        </div>
      </div>

      <div className="chart-toolbar__group" aria-label={labels.timePeriod}>
        <span className="chart-toolbar__label">{labels.timePeriod}</span>
        <div className="control-group">
          {availableTimePeriods.map((option) => (
            <Link
              key={option}
              href={buildHref(pathname, chartType, option)}
              className={option === timePeriod ? 'control-pill control-pill--active' : 'control-pill'}
            >
              {option}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
