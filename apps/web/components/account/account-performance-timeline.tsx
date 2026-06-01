import type { AccountIntelligenceViewModel } from '../../server/services/account-intelligence-service';

type Props = {
  timeline: AccountIntelligenceViewModel['timeline'];
  period: Pick<AccountIntelligenceViewModel['hero'], 'todayPnl' | 'sevenDayPnl' | 'thirtyDayPnl'>;
};

const CHART_WIDTH = 720;
const CHART_HEIGHT = 160;

/**
 * Daily account-value line + daily P/L bars rendered as lightweight inline SVG
 * (no chart dependency). Always paired with a text summary and period P/L chips
 * so meaning is not carried by color alone (a11y). Real snapshot data only —
 * shows a premium empty state when fewer than two daily points exist.
 */
export function AccountPerformanceTimeline({ timeline, period }: Props) {
  if (!timeline.hasData) {
    return (
      <div className="account-timeline account-timeline--empty">
        <p className="account-empty">
          Daily P/L appears once simulated activity is recorded across multiple days. Your first snapshots are captured as you trade.
        </p>
      </div>
    );
  }

  const values = timeline.points.map((p) => p.accountValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-9, max - min);
  const linePath = timeline.points
    .map((p, i) => {
      const x = (i / Math.max(1, timeline.points.length - 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - ((p.accountValue - min) / range) * CHART_HEIGHT;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const first = timeline.points[0]!;
  const last = timeline.points[timeline.points.length - 1]!;
  const overallUp = last.accountValue >= first.accountValue;
  const summary = `Account value across ${timeline.points.length} recorded days. ${timeline.winLossLabel ?? ''}${
    timeline.bestDayLabel ? ` Best day ${timeline.bestDayLabel}.` : ''
  }${timeline.worstDayLabel ? ` Worst day ${timeline.worstDayLabel}.` : ''}`;

  return (
    <div className="account-timeline">
      <div className="account-timeline__chips" role="group" aria-label="Period performance">
        <PeriodChip label="Today" metric={period.todayPnl} />
        <PeriodChip label="7 days" metric={period.sevenDayPnl} />
        <PeriodChip label="30 days" metric={period.thirtyDayPnl} />
      </div>

      <p className="account-timeline__summary" aria-live="polite">{summary}</p>

      <svg
        className="account-timeline__chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
      >
        <path
          d={linePath}
          fill="none"
          stroke={overallUp ? 'var(--chart-positive)' : 'var(--chart-negative)'}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="account-timeline__stats">
        {timeline.bestDayLabel ? <div><span>Best day</span><strong className="account-pnl--positive">{timeline.bestDayLabel}</strong></div> : null}
        {timeline.worstDayLabel ? <div><span>Worst day</span><strong className="account-pnl--negative">{timeline.worstDayLabel}</strong></div> : null}
        {timeline.averageDailyLabel ? <div><span>Avg daily</span><strong>{timeline.averageDailyLabel}</strong></div> : null}
        {timeline.winLossLabel ? <div><span>Up / down days</span><strong>{timeline.winLossLabel}</strong></div> : null}
      </div>

      <p className="account-muted">{timeline.estimatedNote}</p>
    </div>
  );
}

function PeriodChip({ label, metric }: { label: string; metric: { label: string; tone: 'positive' | 'negative' | 'neutral'; available: boolean } }) {
  return (
    <div className={`account-period-chip account-period-chip--${metric.tone}`}>
      <span className="account-period-chip__label">{label}</span>
      <span className="account-period-chip__value">{metric.available ? metric.label : '—'}</span>
    </div>
  );
}
