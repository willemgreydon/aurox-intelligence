import type { SignalAccuracyRow } from '@repo/db';

/**
 * PURE mapper for the Signal Accuracy surface. Turns raw per-interpretation
 * forward-return stats into a display model where SAMPLE SIZE is first-class: a
 * hit rate is only shown once there are enough observations, and reliability is
 * banded by N so an N=4 result never reads as authoritatively as N=4,000. No I/O.
 */

/** Minimum observations before a hit rate is shown at all. */
const MIN_SAMPLE = 20;

export type Reliability = 'insufficient' | 'low' | 'moderate' | 'high';

export type SignalAccuracyBucketVM = {
  interpretation: 'bullish' | 'bearish';
  label: string;
  sampleSize: number;
  hitRatePct: number | null;
  hitRateDisplay: string;
  avgReturnDisplay: string;
  reliability: Reliability;
  reliabilityLabel: string;
};

export type SignalAccuracyViewModel = {
  available: boolean;
  emptyReason: string | null;
  horizonLabel: string;
  buckets: SignalAccuracyBucketVM[];
  totalSamples: number;
  caption: string;
};

function reliabilityFor(n: number): Reliability {
  if (n < MIN_SAMPLE) return 'insufficient';
  if (n < 50) return 'low';
  if (n < 200) return 'moderate';
  return 'high';
}

const RELIABILITY_LABEL: Record<Reliability, string> = {
  insufficient: 'Insufficient sample',
  low: 'Low confidence',
  moderate: 'Moderate confidence',
  high: 'High confidence',
};

function signedPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function mapSignalAccuracy(rows: readonly SignalAccuracyRow[], horizonDays: number): SignalAccuracyViewModel {
  const horizonLabel = `${horizonDays}-session forward return`;
  const totalSamples = rows.reduce((sum, row) => sum + row.total, 0);

  if (rows.length === 0 || totalSamples === 0) {
    return {
      available: false,
      emptyReason:
        'Signal accuracy is still accumulating. Each day the intelligence cron records the universe’s signals; once enough have a forward outcome, hit rates appear here.',
      horizonLabel,
      buckets: [],
      totalSamples: 0,
      caption: '',
    };
  }

  const order: Array<'bullish' | 'bearish'> = ['bullish', 'bearish'];
  const buckets: SignalAccuracyBucketVM[] = order
    .map((interpretation) => {
      const row = rows.find((r) => r.interpretation === interpretation);
      if (!row) return null;
      const reliability = reliabilityFor(row.total);
      const hitRatePct = reliability === 'insufficient' ? null : (row.directionalHits / row.total) * 100;
      return {
        interpretation,
        label: interpretation === 'bullish' ? 'Bullish signals' : 'Bearish signals',
        sampleSize: row.total,
        hitRatePct,
        hitRateDisplay: hitRatePct === null ? '—' : `${hitRatePct.toFixed(0)}%`,
        avgReturnDisplay: signedPct(row.avgForwardReturnPct),
        reliability,
        reliabilityLabel: RELIABILITY_LABEL[reliability],
      } satisfies SignalAccuracyBucketVM;
    })
    .filter((bucket): bucket is SignalAccuracyBucketVM => bucket !== null);

  return {
    available: true,
    emptyReason: null,
    horizonLabel,
    buckets,
    totalSamples,
    caption: `Directional hit rate over the ${horizonLabel}, ${totalSamples} recorded signals. Hit rate shown only at N≥${MIN_SAMPLE}. Past accuracy does not guarantee future results.`,
  };
}
