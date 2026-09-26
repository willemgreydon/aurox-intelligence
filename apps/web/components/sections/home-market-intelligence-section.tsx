import type { MarketStateConstellationViewModel } from '../../server/mappers/market-state-constellation-mapper';
import type { CorrelationHeatmapViewModel } from '../../server/mappers/market-correlation-mapper';
import { MarketStateConstellation } from '../charts/market-state-constellation';
import { CorrelationHeatmap } from '../charts/correlation-heatmap';

type HomeMarketIntelligenceSectionProps = {
  constellation: MarketStateConstellationViewModel | null;
  correlation: CorrelationHeatmapViewModel | null;
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
export function HomeMarketIntelligenceSection({ constellation, correlation }: HomeMarketIntelligenceSectionProps) {
  const showCorrelation = correlation?.available === true;
  if (!constellation && !showCorrelation) {
    return null;
  }

  return (
    <section className="section home-market-intel" aria-labelledby="home-market-intel-title">
      <div className="shell-container home-market-intel__inner">
        <header className="home-market-intel__header">
          <div className="section__eyebrow">Live market intelligence</div>
          <h2 id="home-market-intel-title" className="section__title">
            The market as a system, right now.
          </h2>
          <p className="section__description">
            The same deterministic surfaces that power the workstation — computed live from real market data,
            not a mock. Observation of market structure, not investment advice.
          </p>
        </header>

        <div className="home-market-intel__grid">
          {constellation ? (
            <article className="home-market-intel__panel" aria-labelledby="home-constellation-title">
              <div className="home-market-intel__panel-head">
                <div className="section__eyebrow">Structure</div>
                <h3 id="home-constellation-title" className="home-market-intel__panel-title">
                  Market State Constellation
                </h3>
                <p className="home-market-intel__panel-desc">
                  Every tracked asset placed by momentum and realized volatility, coloured by deterministic
                  signal direction and sized by confidence.
                </p>
              </div>
              <MarketStateConstellation vm={constellation} />
            </article>
          ) : null}

          {showCorrelation && correlation ? (
            <article className="home-market-intel__panel" aria-labelledby="home-correlation-title">
              <div className="home-market-intel__panel-head">
                <div className="section__eyebrow">Relationships</div>
                <h3 id="home-correlation-title" className="home-market-intel__panel-title">
                  Correlation Matrix
                </h3>
                <p className="home-market-intel__panel-desc">
                  Pairwise correlation of synchronized daily returns — how assets move together (green) or
                  apart (red). Insufficient overlap is shown honestly, never as zero.
                </p>
              </div>
              <CorrelationHeatmap vm={correlation} />
            </article>
          ) : null}
        </div>

        <div className="home-market-intel__actions">
          <a className="button button--secondary" href="/market">
            Open the market workstation
          </a>
        </div>
      </div>
    </section>
  );
}
