import { SkeletonWorkspace } from '../../../components/ui/skeleton-workspace';

export default function InvestCryptoLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing crypto lane..."
      subtitle="Loading crypto market rows, risk context, and simulation controls."
      variant="asset-lane"
    />
  );
}
