import { SkeletonWorkspace } from '../../../components/ui/skeleton-workspace';

export default function ReplayLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing intelligence replay..."
      subtitle="Loading event origin, context trails, decision inputs, and outcome joins."
      variant="replay"
    />
  );
}
