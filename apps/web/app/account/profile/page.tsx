import Link from 'next/link';
import { getUserWatchlist } from '@repo/db';
import { ProfileForm } from '../../../components/account/profile-form';
import { Card } from '../../../components/ui/card';
import { SectionHeader } from '../../../components/ui/section-header';
import { requireCurrentSession } from '../../../server/auth/session';
import { getSimulationJournalRowsForCurrentUser } from '../../../server/services/simulation-journal-service';

export const dynamic = 'force-dynamic';

function memberSinceLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const HUB_LINKS = [
  { href: '/account', label: 'Account overview' },
  { href: '/invest/simulation', label: 'Simulation' },
  { href: '/invest/simulation?tab=journal', label: 'Journal' },
  { href: '/portfolio/intelligence', label: 'Portfolio intelligence' },
  { href: '/finance', label: 'Claude Finance' },
  { href: '/account/settings', label: 'Settings' },
];

export default async function AccountProfilePage() {
  const auth = await requireCurrentSession('/account/profile');

  // Lightweight counts only — profile is an identity + preferences hub, not a
  // performance dashboard (that lives on /account).
  const [watchlist, journalRows] = await Promise.all([
    getUserWatchlist(auth.user.id).catch(() => []),
    getSimulationJournalRowsForCurrentUser(120).catch(() => []),
  ]);
  const journalCount = journalRows.filter((row) => row.side !== 'RESET').length;

  return (
    <div className="account-stack">
      <Card>
        <SectionHeader
          eyebrow="Profile"
          title="Identity & simulation profile"
          description="Your account identity and quick links. Simulation only — not a real brokerage account."
        />
        <dl className="account-stats">
          <div><dt>Display name</dt><dd>{auth.user.name}</dd></div>
          <div><dt>Email</dt><dd>{auth.user.email}</dd></div>
          <div><dt>Account role</dt><dd>{auth.user.role}</dd></div>
          <div><dt>Member since</dt><dd>{memberSinceLabel(auth.user.createdAt)}</dd></div>
          <div><dt>Watchlist symbols</dt><dd>{watchlist.length}</dd></div>
          <div><dt>Journal entries</dt><dd>{journalCount}</dd></div>
        </dl>
        <nav className="account-hub-links" aria-label="Account quick links">
          {HUB_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="button button--secondary">{link.label}</Link>
          ))}
        </nav>
      </Card>

      <Card>
        <ProfileForm user={auth.user} />
      </Card>
    </div>
  );
}
