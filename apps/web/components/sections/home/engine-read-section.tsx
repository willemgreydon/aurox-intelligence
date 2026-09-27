import { Card } from '../../ui/card';
import { Section } from '../../ui/section';

type Bias = 'bullish' | 'bearish' | 'neutral';
type Sentiment = 'positive' | 'negative' | 'neutral';
type Severity = 'low' | 'medium' | 'high';

export type EngineFactor = { label: string; value: string; impact: Sentiment; confidence: number };
export type EngineRiskFlag = { label: string; severity: Severity; detail: string };

export type EngineInsight = {
  symbol: string;
  headline: string;
  whatChanged: string;
  stance: Sentiment;
  confidence: number;
  factors: EngineFactor[];
  riskFlags: EngineRiskFlag[];
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
  factorsHeading: string;
  risksHeading: string;
};

function biasLabel(bias: Bias, labels: EngineReadLabels): string {
  if (bias === 'bullish') return labels.bullish;
  if (bias === 'bearish') return labels.bearish;
  return labels.neutral;
}

/** Sentiment (positive/negative/neutral) → chip modifier (bullish/bearish/neutral). */
function sentimentChip(sentiment: Sentiment): Bias {
  if (sentiment === 'positive') return 'bullish';
  if (sentiment === 'negative') return 'bearish';
  return 'neutral';
}

function stanceLabel(sentiment: Sentiment, labels: EngineReadLabels): string {
  return biasLabel(sentimentChip(sentiment), labels);
}

/**
 * "What the engine sees" — the deterministic insight with a confidence meter,
 * stance badge, the key factors that drove it and any risk flags (severity
 * coded), alongside the highest-confidence forecasts. Explainable, indicative.
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
    <Section className="home-live home-engine">
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
                <span className={`home-chip home-chip--${sentimentChip(insight.stance)}`}>
                  {insight.symbol} · {stanceLabel(insight.stance, labels)}
                </span>
              </div>
              <h3 className="home-engine__headline">{insight.headline}</h3>
              <p className="home-engine__what">{insight.whatChanged}</p>

              <div className="home-engine__conf-row">
                <span className="home-engine__conf-label">{labels.confidenceLabel}</span>
                <span className="home-meter home-meter--lg">
                  <span
                    className={`home-meter__fill home-meter__fill--${sentimentChip(insight.stance)}`}
                    style={{ width: `${Math.round(insight.confidence * 100)}%` }}
                  />
                </span>
                <span className="home-engine__conf-value tabular-nums">{Math.round(insight.confidence * 100)}%</span>
              </div>

              {insight.factors.length > 0 ? (
                <div className="home-engine__factors">
                  <div className="home-engine__meta-head">{labels.factorsHeading}</div>
                  <ul className="home-engine__factor-list">
                    {insight.factors.slice(0, 4).map((factor) => (
                      <li key={factor.label} className="home-engine__factor">
                        <span className={`home-dot home-dot--${sentimentChip(factor.impact)}`} aria-hidden="true" />
                        <span className="home-engine__factor-label">{factor.label}</span>
                        <span className="home-engine__factor-value tabular-nums">{factor.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {insight.riskFlags.length > 0 ? (
                <div className="home-engine__risks">
                  <div className="home-engine__meta-head">{labels.risksHeading}</div>
                  <div className="home-engine__risk-chips">
                    {insight.riskFlags.slice(0, 4).map((risk) => (
                      <span key={risk.label} className={`home-risk home-risk--${risk.severity}`} title={risk.detail}>
                        {risk.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="home-engine__note">{labels.indicativeNote}</p>
            </Card>
          ) : null}

          {ranked.length > 0 ? (
            <div className="home-engine__signals">
              <div className="home-engine__meta-head">{labels.highConfidenceHeading}</div>
              <ul className="home-engine__signal-list">
                {ranked.map((f) => (
                  <li key={f.symbol} className="home-engine__signal">
                    <div className="home-engine__signal-head">
                      <span className={`home-chip home-chip--${f.directionalBias}`}>{f.symbol}</span>
                      <span className="home-engine__signal-meta tabular-nums">
                        {biasLabel(f.directionalBias, labels)} · {Math.round(f.confidence * 100)}%
                      </span>
                    </div>
                    <span className="home-meter">
                      <span
                        className={`home-meter__fill home-meter__fill--${f.directionalBias}`}
                        style={{ width: `${Math.round(f.confidence * 100)}%` }}
                      />
                    </span>
                    <span className="home-engine__signal-summary">{f.summary}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Section>
  );
}
