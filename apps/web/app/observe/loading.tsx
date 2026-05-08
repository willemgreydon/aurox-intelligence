import { SkeletonWorkspace } from '../../components/ui/skeleton-workspace';

export default function ObserveLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing market observer..."
      subtitle="Loading observations, regime context, timeline events, and anomaly panels."
      variant="observe"
    />
  );
}
