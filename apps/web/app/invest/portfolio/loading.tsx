import { SkeletonWorkspace } from '../../../components/ui/skeleton-workspace';

export default function InvestPortfolioLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing invest portfolio..."
      subtitle="Fetching positions, allocations, and trade-ready portfolio context."
      variant="portfolio"
    />
  );
}
