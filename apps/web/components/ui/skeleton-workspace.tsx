type SkeletonWorkspaceVariant =
  | 'generic'
  | 'observe'
  | 'dashboard'
  | 'markets-intelligence'
  | 'admin'
  | 'signals'
  | 'portfolio'
  | 'portfolio-intelligence'
  | 'simulation'
  | 'asset-lane'
  | 'news'
  | 'alerts'
  | 'replay';

type SkeletonWorkspaceProps = {
  title: string;
  subtitle: string;
  variant?: SkeletonWorkspaceVariant;
};

function MetricsRow({ count = 4 }: { count?: number }) {
  return (
    <div className="loading-workspace__metrics">
      {Array.from({ length: count }).map((_, index) => (
        <div key={`metric-${index}`} className="skeleton-card shimmer-block loading-workspace__metric-card">
          <div className="skeleton-line loading-workspace__metric-label" />
          <div className="skeleton-line loading-workspace__metric-value" />
        </div>
      ))}
    </div>
  );
}

function ToolbarRow({ chips = 6 }: { chips?: number }) {
  return (
    <div className="loading-workspace__toolbar skeleton-card shimmer-block">
      <div className="loading-workspace__toolbar-group">
        <div className="skeleton-pill loading-workspace__select" />
        <div className="skeleton-pill loading-workspace__select" />
      </div>
      <div className="loading-workspace__toolbar-group">
        {Array.from({ length: chips }).map((_, index) => (
          <div key={`chip-${index}`} className="skeleton-pill loading-workspace__chip" />
        ))}
      </div>
    </div>
  );
}

function PanelGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="loading-workspace__grid">
      {Array.from({ length: count }).map((_, index) => (
        <article key={`panel-${index}`} className="skeleton-card shimmer-block loading-workspace__panel">
          <div className="skeleton-line loading-workspace__panel-title" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </article>
      ))}
    </div>
  );
}

function VariantBody({ variant }: { variant: SkeletonWorkspaceVariant }) {
  if (variant === 'observe') {
    return (
      <>
        <MetricsRow count={5} />
        <PanelGrid count={5} />
      </>
    );
  }
  if (variant === 'dashboard') {
    return (
      <>
        <MetricsRow count={4} />
        <PanelGrid count={4} />
      </>
    );
  }
  if (variant === 'markets-intelligence') {
    return (
      <>
        <ToolbarRow chips={4} />
        <PanelGrid count={4} />
      </>
    );
  }
  if (variant === 'admin') {
    return (
      <>
        <MetricsRow count={3} />
        <PanelGrid count={4} />
      </>
    );
  }
  if (variant === 'signals') {
    return (
      <>
        <ToolbarRow chips={5} />
        <PanelGrid count={4} />
      </>
    );
  }
  if (variant === 'portfolio-intelligence') {
    return (
      <>
        <MetricsRow count={6} />
        <PanelGrid count={4} />
      </>
    );
  }
  if (variant === 'portfolio') {
    return (
      <>
        <MetricsRow count={4} />
        <PanelGrid count={3} />
      </>
    );
  }
  if (variant === 'simulation') {
    return (
      <>
        <MetricsRow count={4} />
        <ToolbarRow chips={4} />
        <PanelGrid count={4} />
      </>
    );
  }
  if (variant === 'asset-lane') {
    return (
      <>
        <ToolbarRow chips={4} />
        <PanelGrid count={4} />
      </>
    );
  }
  if (variant === 'news') {
    return (
      <>
        <ToolbarRow chips={3} />
        <PanelGrid count={5} />
      </>
    );
  }
  if (variant === 'alerts') {
    return (
      <>
        <MetricsRow count={5} />
        <ToolbarRow chips={5} />
        <PanelGrid count={4} />
      </>
    );
  }
  if (variant === 'replay') {
    return (
      <>
        <MetricsRow count={3} />
        <PanelGrid count={4} />
      </>
    );
  }
  return (
    <>
      <MetricsRow count={4} />
      <PanelGrid count={4} />
    </>
  );
}

export function SkeletonWorkspace({ title, subtitle, variant = 'generic' }: SkeletonWorkspaceProps) {
  return (
    <section className="loading-workspace" aria-busy="true" aria-live="polite">
      <header className="loading-workspace__hero skeleton-card shimmer-block">
        <div className="section__eyebrow">Aurox Intelligence</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      <VariantBody variant={variant} />
      <p className="loading-workspace__status">Preparing intelligence workspace...</p>
    </section>
  );
}
