import Link from 'next/link';
import { requireCurrentSession } from '../../server/auth/session';
import { getAccountOverviewData } from '../../server/services/account-service';
import { getAccountIntelligenceViewModel } from '../../server/services/account-intelligence-service';
import { AccountIntelligenceCockpit } from '../../components/account/account-intelligence-cockpit';

// User-specific financial data — never cached at the route level.
export const dynamic = 'force-dynamic';

export default async function AccountOverviewPage() {
  const auth = await requireCurrentSession('/account');
  const [overview, vm] = await Promise.all([
    getAccountOverviewData(auth),
    getAccountIntelligenceViewModel(),
  ]);

  // Identity + session detail is preserved but demoted into a disclosure so the
  // overview leads with the performance cockpit. Workspace preferences live on
  // /account/settings (no longer duplicated here).
  const membershipDisclosure = (
    <div className="account-membership">
      <dl className="account-stats">
        <div><dt>Member since</dt><dd>{overview.memberSinceLabel}</dd></div>
        <div><dt>Signed in as</dt><dd>{overview.user.email}</dd></div>
        <div><dt>Account role</dt><dd><span className="status-pill status-pill--xs status-pill--info">{overview.user.role}</span></dd></div>
        <div><dt>Session expires</dt><dd>{overview.sessionExpiresLabel}</dd></div>
        <div>
          <dt>Active sessions</dt>
          <dd>
            <span
              className="num-bubble num-bubble--info num-bubble--small"
              aria-label={`${overview.activeSessionCount} active sessions`}
            >
              {overview.activeSessionCount}
            </span>
          </dd>
        </div>
        <div><dt>Last activity</dt><dd>{overview.recentSessions[0]?.lastSeenLabel ?? 'Pending activity'}</dd></div>
      </dl>
      <p className="account-muted">
        Manage profile, password, and workspace preferences in{' '}
        <Link href="/account/settings">Settings</Link> and <Link href="/account/profile">Profile</Link>.
      </p>
    </div>
  );

  return <AccountIntelligenceCockpit vm={vm} membershipDisclosure={membershipDisclosure} />;
}
