import { SkeletonWorkspace } from '../../../components/ui/skeleton-workspace';

export default function InvestStocksLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing stock lane..."
      subtitle="Loading stock universe rows, lane filters, and simulation-ready context."
      variant="asset-lane"
    />
  );
}
