import { SkeletonWorkspace } from '../../components/ui/skeleton-workspace';

export default function NewsLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing news stream..."
      subtitle="Loading cross-asset headlines, symbols, and risk-aware summaries."
      variant="news"
    />
  );
}
