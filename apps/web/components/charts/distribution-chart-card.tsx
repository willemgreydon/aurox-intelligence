import type { DistributionBucket } from '../../lib/dashboard/analytics-fixtures';
import { ChartPanel } from './chart-panel';

type DistributionChartCardProps = {
  title: string;
  subtitle: string;
  buckets: DistributionBucket[];
};

export function DistributionChartCard({ title, subtitle, buckets }: DistributionChartCardProps) {
  const max = Math.max(...buckets.map((bucket) => bucket.value), 1);

  return (
    <ChartPanel title={title} subtitle={subtitle} note="Histogram shell for confidence, returns, or probability distributions.">
      <div className="distribution-chart">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="distribution-chart__bucket">
            <div className="distribution-chart__bar-wrap">
              <div className="distribution-chart__bar" style={{ height: `${(bucket.value / max) * 100}%` }} />
            </div>
            <strong>{bucket.value}</strong>
            <span>{bucket.label}</span>
          </div>
        ))}
      </div>
    </ChartPanel>
  );
}
