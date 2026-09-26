import { Card } from '../ui/card';
import type { CandleIntelligenceViewModel, Tone } from '../../server/mappers/candle-intelligence-mapper';

/**
 * Candle Intelligence panel — renders the pre-shaped candlestick intelligence
 * view model. Pure presentation: all interpretation happened server-side in the
 * mapper/engine. Progressive disclosure keeps the default view clean; the full
 * "Why?" evidence chain lives inside a collapsible <details> (RSC-safe, no
 * client JS). Language is evidence-based, never advice.
 */

function bubbleClass(tone: Tone): string {
  const variant = tone === 'positive' ? 'success' : tone === 'negative' ? 'danger' : tone === 'muted' ? 'muted' : 'neutral';
  return `num-bubble num-bubble--${variant} num-bubble--inline`;
}

function pillClass(tone: Tone): string {
  const variant = tone === 'positive' ? 'success' : tone === 'negative' ? 'danger' : tone === 'muted' ? 'neutral' : 'info';
  return `status-pill status-pill--${variant}`;
}

export function CandleIntelligencePanel({ vm }: { vm: CandleIntelligenceViewModel }) {
  return (
    <Card className="analytics-card candle-intel">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Candle Intelligence</div>
          <h3>Deterministic candlestick read</h3>
          <p>Contextual evidence from market structure, candle patterns, momentum, volume and volatility.</p>
        </div>
      </div>

      {!vm.available ? (
        <div className="analytics-card__body">
          <p className="candle-intel__empty" role="status">
            {vm.insufficientMessage ?? 'Insufficient data for candlestick analysis.'}
          </p>
          <p className="candle-intel__disclaimer">{vm.disclaimer}</p>
        </div>
      ) : (
        <div className="analytics-card__body">
          <div className="candle-intel__headline">
            <span className={pillClass(vm.directionTone)}>{vm.directionLabel}</span>
            <strong>{vm.headline}</strong>
            <span className="candle-intel__score">
              Score {vm.scoreDisplay} · Evidence confidence {vm.confidenceDisplay}
            </span>
          </div>

          <div className="candle-intel__confidence" aria-hidden>
            <span className="candle-intel__confidence-fill" style={{ width: `${vm.confidencePct}%` }} />
          </div>
          {vm.hasLowConfidence ? (
            <p className="candle-intel__lowconf">⚠ Low evidence confidence — treat as indicative only.</p>
          ) : null}

          <dl className="candle-intel__summary">
            {vm.summaryRows.map((row) => (
              <div className="candle-intel__row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  <span className={bubbleClass(row.tone)}>{row.value}</span>
                </dd>
              </div>
            ))}
          </dl>

          {vm.multiTimeframe.length > 0 ? (
            <div className="candle-intel__mtf" aria-label="Multi-timeframe context">
              {vm.multiTimeframe.map((tf) => (
                <div className="candle-intel__mtf-item" key={tf.label}>
                  <span className="candle-intel__mtf-label">{tf.label}</span>
                  <span className={bubbleClass(tf.tone)}>{tf.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          {vm.patterns.length > 0 ? (
            <div className="candle-intel__patterns">
              <h4>Detected patterns</h4>
              <ul>
                {vm.patterns.map((p, i) => (
                  <li key={`${p.label}-${i}`}>
                    <span className={pillClass(p.direction === 'Bullish' ? 'positive' : p.direction === 'Bearish' ? 'negative' : 'neutral')}>
                      {p.label}
                    </span>
                    <span className="candle-intel__pattern-strength">{p.strength}</span>
                    <span className="candle-intel__pattern-detail">{p.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <details className="candle-intel__why">
            <summary>Why? — show the evidence chain</summary>
            <div className="candle-intel__why-body">
              {vm.reasons.length > 0 ? (
                <div className="candle-intel__evidence candle-intel__evidence--support">
                  <h5>Supporting evidence</h5>
                  <ul>
                    {vm.reasons.map((r, i) => (
                      <li key={`r-${i}`}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {vm.warnings.length > 0 ? (
                <div className="candle-intel__evidence candle-intel__evidence--counter">
                  <h5>Counter-evidence &amp; caveats</h5>
                  <ul>
                    {vm.warnings.map((w, i) => (
                      <li key={`w-${i}`}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {vm.invalidation.length > 0 ? (
                <div className="candle-intel__evidence candle-intel__evidence--invalidation">
                  <h5>What would invalidate this</h5>
                  <ul>
                    {vm.invalidation.map((inv, i) => (
                      <li key={`i-${i}`}>{inv}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>

          <p className="candle-intel__disclaimer">{vm.disclaimer}</p>
        </div>
      )}
    </Card>
  );
}
