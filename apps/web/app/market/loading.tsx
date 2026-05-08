export default function MarketLoading() {
  return (
    <section className="market-loading" aria-busy="true" aria-live="polite">
      <div className="market-loading__header skeleton-card shimmer-block">
        <div className="skeleton-line market-loading__eyebrow" />
        <div className="skeleton-line market-loading__title" />
        <div className="skeleton-line market-loading__subtitle" />
        <div className="skeleton-line market-loading__summary" />
      </div>

      <div className="market-loading__toolbar skeleton-card shimmer-block">
        <div className="market-loading__toolbar-selectors">
          <div className="skeleton-pill market-loading__select" />
          <div className="skeleton-pill market-loading__select" />
        </div>
        <div className="market-loading__toolbar-chips">
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
        </div>
        <div className="market-loading__toolbar-modes">
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
        </div>
      </div>

      <div className="market-loading__workspace">
        <div className="market-loading__chart skeleton-card shimmer-block">
          <div className="skeleton-line market-loading__chart-overlay" />
          <div className="skeleton-line market-loading__chart-overlay market-loading__chart-overlay--short" />
        </div>

        <aside className="market-loading__sidebar">
          <div className="skeleton-card shimmer-block market-loading__sidebar-card">
            <div className="skeleton-line market-loading__card-title" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
          <div className="skeleton-card shimmer-block market-loading__sidebar-card">
            <div className="skeleton-line market-loading__card-title" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
          <div className="skeleton-card shimmer-block market-loading__sidebar-card">
            <div className="skeleton-line market-loading__card-title" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
          <div className="skeleton-card shimmer-block market-loading__sidebar-card">
            <div className="skeleton-line market-loading__card-title" />
            <div className="skeleton-line market-loading__status-text" />
            <div className="skeleton-pill market-loading__cta" />
          </div>
        </aside>
      </div>

      <div className="market-loading__status-copy">
        <p>Preparing market workstation...</p>
        <p>Loading provider-backed snapshots, signals, and simulation context.</p>
      </div>
    </section>
  );
}
