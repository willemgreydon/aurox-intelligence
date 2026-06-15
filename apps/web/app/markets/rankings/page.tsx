import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Section } from '../../../components/ui/section';
import { MiniSparkline } from '../../../components/charts/mini-sparkline';
import { getRequestLocale } from '../../../server/i18n/locale';
import { getMessages } from '../../../lib/i18n/messages';
import { getInvestOverviewData } from '../../../server/services/invest-service';
import { formatUsdPrice, formatPercentChange } from '../../../server/lib/quote-display';
import { deriveAssetDecisionIntelligence } from '../../../server/services/decision-intelligence-service';
import { perfLog, perfNow } from '../../../server/lib/perf';

export const revalidate = 30;

type DirTone = 'positive' | 'negative' | 'neutral';

function dirTone(value: number, threshold = 0): DirTone {
  if (value > threshold) return 'positive';
  if (value < -threshold) return 'negative';
  return 'neutral';
}

function dirGlyph(tone: DirTone): string {
  return tone === 'positive' ? '▲' : tone === 'negative' ? '▼' : '—';
}

function riskTone(risk: string): 'low' | 'medium' | 'high' {
  const r = risk.toLowerCase();
  if (r === 'low') return 'low';
  if (r === 'medium') return 'medium';
  return 'high'; // high / extreme
}

type RankingParams = {
  assetClass?: string;
  recommendation?: string;
  risk?: string;
  signal?: string;
  q?: string;
};

export default async function MarketRankingsPage({ searchParams }: { searchParams?: Promise<RankingParams> }) {
  const pageStart = perfNow();
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const params = (searchParams ? await searchParams : {}) as RankingParams;
  const invest = await getInvestOverviewData(locale, messages, {
    includeHistory: true,
    quoteSymbolLimit: 96,
    historySymbolLimit: 72,
    pageContext: 'markets-rankings',
  });
  perfLog('page:/markets/rankings total', pageStart);

  const bySymbol = new Map(invest.rankedAssets.map((item) => [item.symbol, item]));
  const assets = invest.groupedAssets.flatMap((group) => group.items);

  const rows = assets.map((asset) => {
    const ranking = bySymbol.get(asset.symbol);
    const decision = deriveAssetDecisionIntelligence({
      symbol: asset.symbol,
      assetClass: asset.assetClass,
      history: invest.sparklineBySymbol[asset.symbol] ?? [],
      latestPrice: asset.price,
      dayMovePercent: asset.changePercent,
    });
    const volatilityProxy = Math.max(0.001, Math.abs(asset.changePercent ?? 0) / 100);
    const liquidityProxy = asset.assetClass === 'crypto' ? 0.45 : asset.assetClass === 'etf' ? 0.62 : 0.74;

    return {
      rank: ranking?.rank ?? 999,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      price: asset.price,
      move: asset.changePercent,
      signal: decision.signal.label,
      signalScore: decision.signal.score,
      confidence: ranking?.confidence ?? decision.signal.confidence,
      risk: decision.risk.label,
      recommendation: decision.recommendation.value,
      liquidityProxy,
      volatilityProxy,
      sparkline: invest.sparklineBySymbol[asset.symbol] ?? [],
    };
  });

  const filtered = rows
    .filter((row) => (params.assetClass ? row.assetClass === params.assetClass : true))
    .filter((row) =>
      params.recommendation ? row.recommendation.toLowerCase() === params.recommendation.toLowerCase() : true,
    )
    .filter((row) => (params.risk ? row.risk.toLowerCase() === params.risk.toLowerCase() : true))
    .filter((row) =>
      params.signal
        ? params.signal === 'bullish'
          ? row.signalScore > 0.1
          : params.signal === 'bearish'
            ? row.signalScore < -0.1
            : true
        : true,
    )
    .filter((row) => {
      if (!params.q) return true;
      const q = params.q.toLowerCase();
      return row.symbol.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
    })
    .sort((a, b) => a.rank - b.rank || b.confidence - a.confidence);

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Markets / Rankings</div>
            <h1 className="dashboard-section-heading__title">Cross-asset ranking</h1>
            <p className="dashboard-section-heading__description">
              Stocks, ETFs, and crypto ranked by deterministic signal and risk-aware recommendation logic.
            </p>
          </div>
        </header>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <form className="stock-search-form" action="/markets/rankings" method="get">
          <label className="form-field">
            <span>Search</span>
            <input type="search" name="q" defaultValue={params.q ?? ''} placeholder="Symbol or name" />
          </label>
          <label className="form-field">
            <span>Asset class</span>
            <select name="assetClass" defaultValue={params.assetClass ?? ''}>
              <option value="">All</option>
              <option value="stock">Stock</option>
              <option value="etf">ETF</option>
              <option value="crypto">Crypto</option>
            </select>
          </label>
          <label className="form-field">
            <span>Recommendation</span>
            <select name="recommendation" defaultValue={params.recommendation ?? ''}>
              <option value="">All</option>
              <option value="Buy">Buy</option>
              <option value="Hold">Hold</option>
              <option value="Watch">Watch</option>
              <option value="Reduce">Reduce</option>
              <option value="Avoid">Avoid</option>
            </select>
          </label>
          <label className="form-field">
            <span>Risk</span>
            <select name="risk" defaultValue={params.risk ?? ''}>
              <option value="">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Extreme">Extreme</option>
            </select>
          </label>
          <label className="form-field">
            <span>Signal</span>
            <select name="signal" defaultValue={params.signal ?? ''}>
              <option value="">All</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
            </select>
          </label>
          <button type="submit" className="button button--primary">
            Apply filters
          </button>
          <Link href="/markets/rankings" className="button button--secondary">
            Reset
          </Link>
        </form>
      </Section>

      <Section className="dashboard-section">
        <div className="market-list">
          {filtered.map((row) => {
            const moveTone = dirTone(row.move ?? 0);
            const signalTone = dirTone(row.signalScore, 0.1);
            const confidencePct = Math.round(row.confidence * 100);
            const confidenceVars = { '--confidence-pct': `${confidencePct}%` } as CSSProperties;
            return (
              <article key={row.symbol} className="market-row gt-hover-lift">
                <div className="market-row__identity">
                  <div className="market-row__symbol">#{row.rank}</div>
                  <div className="market-row__title">{row.symbol}</div>
                  <div className="market-row__meta">{row.assetClass.toUpperCase()}</div>
                </div>
                <div className="market-row__chart">
                  <MiniSparkline points={row.sparkline} label={row.symbol} signalScore={row.signalScore} />
                </div>
                <div className="market-row__price">{formatUsdPrice(row.price, locale, '-')}</div>
                <div className={`market-row__move market-row__move--${moveTone}`}>
                  <span aria-hidden="true">{dirGlyph(moveTone)}</span> {formatPercentChange(row.move, '-')}
                </div>
                <div className="market-row__freshness">
                  <span className={`market-signal market-signal--${signalTone}`}>
                    <span aria-hidden="true">{dirGlyph(signalTone)}</span> {row.signal}
                  </span>
                </div>
                <div className="market-row__status">
                  <span
                    className="confidence-microbar"
                    style={confidenceVars}
                    role="img"
                    aria-label={`Confidence ${confidencePct}%`}
                  >
                    <span className="confidence-microbar__fill" />
                  </span>
                  <span className="confidence-microbar__value">{confidencePct}%</span>
                </div>
                <div className="market-row__thesis">
                  <span className={`risk-dot risk-dot--${riskTone(row.risk)}`} aria-hidden="true" /> Risk {row.risk} ·{' '}
                  {row.recommendation}
                </div>
                <div className="market-row__actions">
                  Liq {row.liquidityProxy.toFixed(2)} | Vol {row.volatilityProxy.toFixed(3)}
                </div>
              </article>
            );
          })}
        </div>
      </Section>
    </>
  );
}
