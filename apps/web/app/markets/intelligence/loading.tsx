import { SkeletonWorkspace } from '../../../components/ui/skeleton-workspace';

export default function MarketsIntelligenceLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing market intelligence workstation..."
      subtitle="Loading asset switcher, lane filters, explainable panels, and readiness context."
      variant="markets-intelligence"
    />
  );
}
