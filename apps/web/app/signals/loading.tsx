import { SkeletonWorkspace } from '../../components/ui/skeleton-workspace';

export default function SignalsLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing signal workstation..."
      subtitle="Loading signal filters, decision history, and explainable scoring layers."
      variant="signals"
    />
  );
}
