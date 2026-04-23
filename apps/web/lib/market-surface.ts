import type { ComparisonBar, DistributionBucket } from './dashboard/analytics-fixtures';

type LabeledChange = {
  label: string;
  value: number | null;
};

export function buildComparisonBars(items: LabeledChange[], limit = 5): ComparisonBar[] {
  return items
    .filter((item): item is { label: string; value: number } => item.value !== null)
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, limit)
    .map((item) => ({
      label: item.label,
      value: Number(item.value.toFixed(2)),
      tone: item.value > 0 ? 'positive' : item.value < 0 ? 'negative' : 'neutral',
    }));
}

export function buildChangeDistribution(values: Array<number | null>): DistributionBucket[] {
  const buckets = [
    { label: '< -2%', min: Number.NEGATIVE_INFINITY, max: -2, value: 0 },
    { label: '-2 to 0%', min: -2, max: 0, value: 0 },
    { label: '0 to 1%', min: 0, max: 1, value: 0 },
    { label: '1 to 2%', min: 1, max: 2, value: 0 },
    { label: '2 to 4%', min: 2, max: 4, value: 0 },
    { label: '> 4%', min: 4, max: Number.POSITIVE_INFINITY, value: 0 },
  ];

  for (const rawValue of values) {
    if (rawValue === null) {
      continue;
    }

    const bucket = buckets.find((candidate) => rawValue >= candidate.min && rawValue < candidate.max);

    if (bucket) {
      bucket.value += 1;
    }
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

export function countDirectionalMoves(values: Array<number | null>) {
  return values.reduce(
    (accumulator, value) => {
      if (value === null) {
        accumulator.unknown += 1;
      } else if (value > 0) {
        accumulator.positive += 1;
      } else if (value < 0) {
        accumulator.negative += 1;
      } else {
        accumulator.flat += 1;
      }

      return accumulator;
    },
    { positive: 0, negative: 0, flat: 0, unknown: 0 },
  );
}
