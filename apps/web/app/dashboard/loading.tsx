import { SkeletonWorkspace } from '../../components/ui/skeleton-workspace';

export default function DashboardLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing dashboard workspace..."
      subtitle="Loading KPI strips, market modules, signals context, and news surfaces."
      variant="dashboard"
    />
  );
}
