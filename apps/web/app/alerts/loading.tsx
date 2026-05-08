import { SkeletonWorkspace } from '../../components/ui/skeleton-workspace';

export default function AlertsLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing alert center..."
      subtitle="Loading alert groups, severity filters, and replay context links."
      variant="alerts"
    />
  );
}
