import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireCurrentSession } from '../../server/auth/session';

/**
 * Admin area guard.
 *
 * Non-admin sessions must NOT reach admin content, but they also must not be
 * shown a misleading "page not found" (which reads as a broken route / missing
 * page). We deny access with an explicit, honest 403-style state instead of
 * `notFound()` — unauthorized is a distinct condition from missing (see
 * financial-UI error-state invariants). Access to the content itself remains
 * fully blocked: children are only rendered for role === 'admin'.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await requireCurrentSession('/admin');

  if (auth.user.role !== 'admin') {
    return (
      <div className="dashboard-page-container">
        <section className="dashboard-section dashboard-section--hero" aria-labelledby="admin-access-restricted-title">
          <div className="aurox-empty-state" role="status">
            <p className="section__eyebrow">Admin</p>
            <h1 id="admin-access-restricted-title" className="aurox-empty-state__title">
              Access restricted
            </h1>
            <p className="text-muted">
              This area requires an administrator role. Your account is signed in but does not have
              admin permissions, so the admin console is not available to you.
            </p>
            <div className="hero__actions">
              <Link href="/dashboard" className="button button--primary">
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
