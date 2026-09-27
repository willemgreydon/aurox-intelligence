import { Card } from '../../ui/card';
import { Section } from '../../ui/section';

type Bias = 'bullish' | 'bearish' | 'neutral';

export type EngineInsight = {
  symbol: string;
  headline: string;
  whatChanged: string;
  stance: string;
  confidence: number;
} | null;

export type EngineForecast = {
  symbol: string;
  directionalBias: Bias;
  confidence: number;
  summary: string;
};

export type EngineReadLabels = {
  eyebrow: string;
  title: string;
  empty: string;
  confidenceLabel: string;
  highConfidenceHeading: string;
  bullish: string;
  bearish: string;
  neutral: string;
  indicativeNote: string;
};

function biasLabel(bias: Bias, labels: EngineReadLabels): string {
  if (bias === 'bullish') return labels.bullish;
  if (bias === 'bearish') return labels.bearish;
  return labels.neutral;
}

/**
 * "What the engine sees" — the deterministic market insight (headline + what
 * changed + confidence) alongside the highest-confidence forecasts. Explainable
 * decision-support: every claim shows its confidence and is marked indicative,
 * never a guaranteed call.
 */
export function EngineReadSection({
  insight,
  forecasts,
  labels,
}: {
  insight: EngineInsight;
  forecasts: EngineForecast[];
  labels: EngineReadLabels;
}) {
  const ranked = [...forecasts].sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  const isEmpty = insight === null && ranked.length === 0;

  return (
    <Section className="section home-live home-engine">
      <div className="shell-container">
        <header className="home-live__header">
          <div className="section__eyebrow">{labels.eyebrow}</div>
          <h2 className="section__title home-live__title">{labels.title}</h2>
        </header>

        {isEmpty ? (
          <p className="home-live__empty">{labels.empty}</p>
        ) : (
          <div className="home-engine__grid">
            {insight ? (
              <Card className="home-engine__lead">
                <div className="home-engine__lead-head">
                  <span className={`home-chip home-chip--${insight.stance === 'bullish' || insight.stance === 'bearish' ? insight.stance : 'neutral'}`}>
                    {insight.symbol}
                  </span>
                  <span className="home-engine__conf tabular-nums">
                    {labels.confidenceLabel} {Math.round(insight.confidence * 100)}%
                  </span>
                </div>
                <h3 className="home-engine__headline">{insight.headline}</h3>
                <p className="home-engine__what">{insight.whatChanged}</p>
                <p className="home-engine__note">{labels.indicativeNote}</p>
              </Card>
            ) : null}

            {ranked.length > 0 ? (
              <div className="home-engine__signals">
                <div className="home-engine__signals-head">{labels.highConfidenceHeading}</div>
                <ul className="home-engine__signal-list">
                  {ranked.map((f) => (
                    <li key={f.symbol} className="home-engine__signal">
                      <span className={`home-chip home-chip--${f.directionalBias}`}>{f.symbol}</span>
                      <span className="home-engine__signal-summary">{f.summary}</span>
                      <span className="home-engine__signal-meta tabular-nums">
                        {biasLabel(f.directionalBias, labels)} · {Math.round(f.confidence * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Section>
  );
}
