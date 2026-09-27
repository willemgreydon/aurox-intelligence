export type MarketGraphUnavailableLabels = {
  title: string;
  body: string;
  autoUpdating: string;
};

/**
 * Graceful degraded state for the hero market chart. Renders in the chart's exact
 * footprint (no layout shift) when no renderable series is available — e.g. while
 * the market-history feed is briefly unavailable. A muted ghost-chart silhouette
 * signals "a chart belongs here", and the message makes the outage read as
 * temporary and self-healing rather than broken. Presentation-only, server-safe,
 * accessible (role=status), and motion-reduced-friendly.
 */
export function MarketGraphUnavailable({ labels }: { labels: MarketGraphUnavailableLabels }) {
  return (
    <div className="chart-unavailable" role="status" aria-live="polite">
      <div className="chart-unavailable__skeleton" aria-hidden="true">
        <svg viewBox="0 0 980 300" preserveAspectRatio="none" className="chart-unavailable__ghost">
          <path
            className="chart-unavailable__ghost-area"
            d="M0,232 C120,206 190,250 280,204 C372,158 440,188 540,138 C650,84 720,150 820,110 C892,82 940,128 980,104 L980,300 L0,300 Z"
          />
          <path
            className="chart-unavailable__ghost-line"
            d="M0,232 C120,206 190,250 280,204 C372,158 440,188 540,138 C650,84 720,150 820,110 C892,82 940,128 980,104"
          />
        </svg>
        <span className="chart-unavailable__shimmer" />
      </div>

      <div className="chart-unavailable__content">
        <span className="chart-unavailable__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 14l3.2-3.4 3 2.4L20 7" />
          </svg>
        </span>
        <p className="chart-unavailable__title">{labels.title}</p>
        <p className="chart-unavailable__body">{labels.body}</p>
        <span className="chart-unavailable__status">
          <span className="chart-unavailable__dot" aria-hidden="true" />
          <span className="chart-unavailable__status-text">{labels.autoUpdating}</span>
        </span>
      </div>
    </div>
  );
}
