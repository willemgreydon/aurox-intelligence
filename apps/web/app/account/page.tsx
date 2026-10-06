import Link from 'next/link';
import { requireCurrentSession } from '../../server/auth/session';
import { getAccountOverviewData } from '../../server/services/account-service';
import { getAccountIntelligenceViewModel } from '../../server/services/account-intelligence-service';
import { AccountIntelligenceCockpit } from '../../components/account/account-intelligence-cockpit';
import { AccountIdentityPanel } from '../../components/account/account-identity-panel';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';

function identityReference(userId: string): string {
  const compactId = userId.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (compactId.length < 12) return 'SIMULATION';
  const suffix = compactId.slice(-12);
  return `${suffix.slice(0, 4)} ${suffix.slice(4, 8)} ${suffix.slice(8)}`;
}

// User-specific financial data — never cached at the route level.
export const dynamic = 'force-dynamic';

export default async function AccountOverviewPage() {
  const auth = await requireCurrentSession('/account');
  const locale = await getRequestLocale();
  const [overview, vm] = await Promise.all([
    getAccountOverviewData(auth, locale),
    getAccountIntelligenceViewModel(locale),
  ]);
  const messages = getMessages(locale);

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

  // Relocated to appear after Recent simulated actions on mobile only (CSS). The
  // same content renders in the desktop sidebar — one shared component, no
  // duplicated markup.
  const accountDetails = (
    <AccountIdentityPanel
      name={auth.user.name}
      email={auth.user.email}
      role={auth.user.role}
      headingTag="h2"
    />
  );

  return (
    <AccountIntelligenceCockpit
      vm={vm}
      membershipDisclosure={membershipDisclosure}
      identityCardLabels={{ ...messages.account.identityCard, number: identityReference(auth.user.id) }}
      identityDetails={{ role: overview.user.role, memberSince: overview.memberSinceLabel }}
      accountDetails={accountDetails}
    />
  );
}
