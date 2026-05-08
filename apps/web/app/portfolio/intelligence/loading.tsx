import { SkeletonWorkspace } from '../../../components/ui/skeleton-workspace';

export default function PortfolioIntelligenceLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing portfolio intelligence..."
      subtitle="Loading allocation KPIs, risk overlays, and decision diagnostics."
      variant="portfolio-intelligence"
    />
  );
}
