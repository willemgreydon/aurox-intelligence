import type { MarketStateConstellationViewModel } from '../../server/mappers/market-state-constellation-mapper';
import type { CorrelationHeatmapViewModel } from '../../server/mappers/market-correlation-mapper';
import Link from 'next/link';
import { MarketStateConstellation } from '../charts/market-state-constellation';
import { CorrelationHeatmap } from '../charts/correlation-heatmap';

type HomeMarketIntelligenceSectionProps = {
  constellation: MarketStateConstellationViewModel | null;
  correlation: CorrelationHeatmapViewModel | null;
  labels: Parameters<typeof MarketStateConstellation>[0]['labels'];
};

/**
 * Homepage "Live market intelligence" band — reuses the public, read-model-driven
 * Market State Constellation and Correlation Matrix (as shipped on /market) to
 * show the platform's real analytical output above the marketing copy. Both are
 * optional: each panel renders only when its guarded server read resolved, and
 * the whole band is omitted when neither is available — never an empty shell.
 *
 * Server component. No domain math here; it paints pre-shaped view models.
 */
export function HomeMarketIntelligenceSection({ constellation, correlation, labels }: HomeMarketIntelligenceSectionProps) {
  const showCorrelation = correlation?.available === true;
  if (!constellation && !showCorrelation) {
    return null;
  }

  return (
    <section className="section home-market-intel" aria-labelledby="home-market-intel-title">
      <div className="shell-container home-market-intel__inner">
        <header className="home-market-intel__header">
          <div className="section__eyebrow">{labels.homeEyebrow}</div>
          <h2 id="home-market-intel-title" className="section__title">
            {labels.homeTitle}
          </h2>
          <p className="section__description">
            {labels.homeDescription}
          </p>
        </header>

        <div className="home-market-intel__grid">
          {constellation ? (
            <article className="home-market-intel__panel" aria-labelledby="home-constellation-title">
              <div className="home-market-intel__panel-head">
                <div className="section__eyebrow">{labels.structure}</div>
                <h3 id="home-constellation-title" className="home-market-intel__panel-title">
                  {labels.title}
                </h3>
                <p className="home-market-intel__panel-desc">
                  {labels.description}
                </p>
              </div>
              <MarketStateConstellation vm={constellation} labels={labels} />
            </article>
          ) : null}

          {showCorrelation && correlation ? (
            <article className="home-market-intel__panel" aria-labelledby="home-correlation-title">
              <div className="home-market-intel__panel-head">
                <div className="section__eyebrow">{labels.relationships}</div>
                <h3 id="home-correlation-title" className="home-market-intel__panel-title">
                  {labels.correlationTitle}
                </h3>
                <p className="home-market-intel__panel-desc">
                  {labels.correlationDescription}
                </p>
              </div>
              <CorrelationHeatmap vm={correlation} />
            </article>
          ) : null}
        </div>

        <div className="home-market-intel__actions">
          <Link className="button button--secondary" href="/market">{labels.openWorkstation}</Link>
        </div>
      </div>
    </section>
  );
}
