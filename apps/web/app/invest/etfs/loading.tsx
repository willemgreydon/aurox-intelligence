import { SkeletonWorkspace } from '../../../components/ui/skeleton-workspace';

export default function InvestEtfsLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing ETF lane..."
      subtitle="Loading ETF rows, exposure summaries, and simulation planning surfaces."
      variant="asset-lane"
    />
  );
}
