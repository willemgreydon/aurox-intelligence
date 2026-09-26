import type { SignalConfluenceVM } from '../../server/mappers/candle-intelligence-mapper';

/**
 * Signal Confluence — the deterministic candle-intelligence evidence channels
 * (trend / momentum / volume / volatility) as diverging bars around a zero
 * centre: right = bullish agreement, left = bearish. Shows at a glance WHEN the
 * channels agree vs. diverge, and the overall confluence + confidence. Server
 * component; all scores come from the pure engine via the mapper.
 */

const DIRECTION_LABEL: Record<'bullish' | 'bearish' | 'neutral', string> = {
  bullish: 'Bullish',
  bearish: 'Bearish',
  neutral: 'Neutral',
};

export function SignalConfluence({ confluence }: { confluence: SignalConfluenceVM }) {
  if (confluence.channels.length === 0) return null;

  return (
    <div className="confluence">
      <ul className="confluence__rows">
        {confluence.channels.map((ch) => {
          const half = Math.min(50, Math.abs(ch.score) * 50);
          return (
            <li key={ch.key} className={`confluence__row confluence__row--${ch.direction}`}>
              <span className="confluence__label">{ch.label}</span>
              <span
                className="confluence__track"
                role="img"
                aria-label={`${ch.label}: ${DIRECTION_LABEL[ch.direction]} ${ch.score >= 0 ? '+' : ''}${ch.score.toFixed(2)}`}
              >
                <span className="confluence__center" aria-hidden="true" />
                <span
                  className="confluence__fill"
                  style={ch.score >= 0 ? { left: '50%', width: `${half}%` } : { right: '50%', width: `${half}%` }}
                />
              </span>
              <span className="confluence__score">
                {ch.score >= 0 ? '+' : ''}
                {ch.score.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className={`confluence__overall confluence__overall--${confluence.overallDirection}`}>
        <span className="confluence__overall-label">Confluence</span>
        <span className="confluence__overall-value">
          {DIRECTION_LABEL[confluence.overallDirection]} · {confluence.overallScore >= 0 ? '+' : ''}
          {confluence.overallScore.toFixed(2)}
        </span>
        <span className="confluence__overall-conf">{confluence.confidencePct}% confidence</span>
      </div>
    </div>
  );
}
