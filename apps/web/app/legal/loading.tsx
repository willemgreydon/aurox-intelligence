import { SkeletonWorkspace } from '../../components/ui/skeleton-workspace';

export default function LegalLoading() {
  return (
    <SkeletonWorkspace
      title="Preparing legal resources..."
      subtitle="Loading terms, privacy, disclosures, and policy documents."
      variant="generic"
    />
  );
}
