import { SkeletonWorkspace } from '../../components/ui/skeleton-workspace';

export default function PortfolioLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing portfolio workspace..."
      subtitle="Loading allocations, positions, and portfolio-level diagnostics."
      variant="portfolio"
    />
  );
}
