import type { ReactNode } from 'react';

type AccountIdentityPanelProps = {
  name: string;
  email: string;
  role: string;
  /**
   * Heading tag for the "Signed in as …" title. The desktop sidebar renders it as
   * the workspace heading (h1); the relocated mobile "Account details" section
   * renders it as a subsection heading (h2) so the page keeps a single h1.
   */
  headingTag?: 'h1' | 'h2';
};

/**
 * Single source of the account identity summary (workspace header + email / role /
 * status meta). Rendered in two places with CSS visibility so the markup is never
 * duplicated: the desktop sidebar (`.account-sidebar__intro`, hidden on mobile) and
 * the mobile "Account details" section after Recent simulated actions
 * (`.account-details-mobile`, hidden on desktop).
 */
export function AccountIdentityPanel({ name, email, role, headingTag = 'h2' }: AccountIdentityPanelProps): ReactNode {
  const Title = headingTag;

  return (
    <>
      <div className="account-sidebar__header">
        <div className="section__eyebrow">Account workspace</div>
        <Title className="account-sidebar__title">Signed in as {name}</Title>
        <p className="account-sidebar__description">
          Manage your profile, keep your login secure, and monitor your active account session footprint.
        </p>
      </div>

      <div className="account-sidebar__summary account-meta-list">
        <div className="account-meta-row">
          <span>Email</span>
          <strong title={email}>{email}</strong>
        </div>
        <div className="account-meta-row">
          <span>Role</span>
          <span className="status-pill status-pill--xs status-pill--info">{role}</span>
        </div>
        <div className="account-meta-row">
          <span>Status</span>
          <span className="status-pill status-pill--xs status-pill--simulation">SIMULATION</span>
        </div>
      </div>
    </>
  );
}
