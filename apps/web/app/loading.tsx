import { SkeletonWorkspace } from '../components/ui/skeleton-workspace';

export default function Loading() {
  return (
    <SkeletonWorkspace
      title="Preparing intelligence workspace..."
      subtitle="Loading cross-asset data, explainable signals, and simulation-safe context."
    />
  );
}
