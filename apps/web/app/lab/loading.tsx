import { SkeletonWorkspace } from '../../components/ui/skeleton-workspace';

export default function LabLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing the Aurox Lab..."
      subtitle="Loading deterministic, offline-capable interactive tools."
      variant="dashboard"
    />
  );
}
