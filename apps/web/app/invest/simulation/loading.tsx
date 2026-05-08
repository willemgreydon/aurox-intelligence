import { SkeletonWorkspace } from '../../../components/ui/skeleton-workspace';

export default function InvestSimulationLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing simulation cockpit..."
      subtitle="Loading account state, paper positions, safety checks, and order forms."
      variant="simulation"
    />
  );
}
