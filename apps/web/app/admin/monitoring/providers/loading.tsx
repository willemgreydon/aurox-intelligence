import { SkeletonWorkspace } from '../../../../components/ui/skeleton-workspace';

export default function AdminMonitoringProvidersLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing provider monitoring..."
      subtitle="Loading provider cards, status rows, and configuration visibility."
      variant="admin"
    />
  );
}
