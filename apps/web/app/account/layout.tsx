import type { ReactNode } from 'react';
import { AccountIdentityPanel } from '../../components/account/account-identity-panel';
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
            {/* Desktop-only identity summary. On mobile the sidebar collapses to the
                nav alone; this same content is relocated below "Recent simulated
                actions" as an Account details section (shared AccountIdentityPanel). */}
            <div className="account-sidebar__intro">
              <AccountIdentityPanel
                name={auth.user.name}
                email={auth.user.email}
                role={auth.user.role}
                headingTag="h1"
              />
            </div>

            <AccountNav />
          </Card>
        </aside>

        <div className="account-content">{children}</div>
      </div>
    </Section>
  );
}
