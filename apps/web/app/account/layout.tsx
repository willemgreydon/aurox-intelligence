import type { ReactNode } from 'react';
import { AccountNav } from '../../components/account/account-nav';
import { Card } from '../../components/ui/card';
import { Section } from '../../components/ui/section';
import { requireCurrentSession } from '../../server/auth/session';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const auth = await requireCurrentSession('/account');

  return (
    <Section className="account-section">
      <div className="account-layout">
        <aside className="account-sidebar">
          <Card className="account-sidebar__card">
            <div className="account-sidebar__header">
              <div className="section__eyebrow">Account workspace</div>
              <h1 className="account-sidebar__title">Signed in as {auth.user.name}</h1>
              <p className="account-sidebar__description">
                Manage your profile, keep your login secure, and monitor your active account session footprint.
              </p>
            </div>

            <div className="account-sidebar__summary">
              <div>
                <span>Email</span>
                <strong>{auth.user.email}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{auth.user.role}</strong>
              </div>
            </div>

            <AccountNav />
          </Card>
        </aside>

        <div className="account-content">{children}</div>
      </div>
    </Section>
  );
}
