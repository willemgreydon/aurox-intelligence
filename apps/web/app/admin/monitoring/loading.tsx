import { SkeletonWorkspace } from '../../../components/ui/skeleton-workspace';

export default function AdminMonitoringLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing monitoring workspace..."
      subtitle="Loading provider health, latency snapshots, and monitoring preferences."
      variant="admin"
    />
  );
}
