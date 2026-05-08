import { SkeletonWorkspace } from '../../components/ui/skeleton-workspace';

export default function AdminLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing admin workspace..."
      subtitle="Loading system controls, provider states, and readiness diagnostics."
      variant="admin"
    />
  );
}
