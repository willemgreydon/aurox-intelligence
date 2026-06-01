import type { Metadata } from 'next';
import { requireCurrentSession } from '../../server/auth/session';
import { getClaudeFinanceCockpitData } from '../../server/services/finance-cockpit-service';
import { ClaudeFinanceCockpit } from '../../components/finance/claude-finance-cockpit';

// User-specific financial data — must never be cached at the route level.
// See .claude/rules/user-specific-cache-rule.md and next-cache-rule.md.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Claude Finance · Aurox Intelligence',
  description:
    'Simulation-only finance cockpit: portfolio intelligence, starred lanes, and preview-only simulated broker activity. Not financial advice.',
};

export default async function ClaudeFinancePage() {
  await requireCurrentSession('/finance');
  const cockpit = await getClaudeFinanceCockpitData();
  return <ClaudeFinanceCockpit cockpit={cockpit} />;
}
