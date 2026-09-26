import type { SignalAccuracyViewModel } from '../../server/mappers/signal-accuracy-mapper';

/**
 * Signal Accuracy — empirical directional hit rate of the deterministic signal,
 * measured against realized forward returns from recorded signal history. Sample
 * size is first-class: a hit rate only appears at N≥20, and reliability is banded
 * by N so a tiny sample never reads as authoritative. Server component.
 */

export function SignalAccuracyMatrix({ vm }: { vm: SignalAccuracyViewModel }) {
  if (!vm.available) {
    return (
      <div className="sigacc sigacc--empty" role="status">
        <p className="sigacc__empty-text">{vm.emptyReason}</p>
      </div>
    );
  }

  return (
    <div className="sigacc">
      <div className="sigacc__grid">
        {vm.buckets.map((bucket) => (
          <div key={bucket.interpretation} className={`sigacc__card sigacc__card--${bucket.interpretation}`}>
            <div className="sigacc__card-head">
              <span className="sigacc__card-label">{bucket.label}</span>
              <span className={`sigacc__reliability sigacc__reliability--${bucket.reliability}`}>
                {bucket.reliabilityLabel}
              </span>
            </div>
            <div className="sigacc__hitrate">{bucket.hitRateDisplay}</div>
            <div className="sigacc__hitrate-label">directional hit rate</div>
            <dl className="sigacc__stats">
              <div>
                <dt>Sample</dt>
                <dd>N = {bucket.sampleSize}</dd>
              </div>
              <div>
                <dt>Avg forward</dt>
                <dd
                  className={
                    bucket.avgReturnDisplay.startsWith('-') ? 'sigacc__stat--negative' : 'sigacc__stat--positive'
                  }
                >
                  {bucket.avgReturnDisplay}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <p className="sigacc__caption">{vm.caption}</p>
    </div>
  );
}
