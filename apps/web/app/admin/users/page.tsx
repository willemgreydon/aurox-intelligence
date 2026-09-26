import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import {
  forceLogoutUserAction,
  setUserRoleAction,
  setUserStatusAction,
} from '../../../server/actions/admin-user-actions';
import { requireCurrentSession } from '../../../server/auth/session';
import { getAdminUsersData } from '../../../server/services/admin-users-service';

// User-specific, permission-sensitive data — never cache the roster.
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  // The /admin layout already gates on the admin role; re-reading the cached
  // session here yields the viewer id so we can block self role changes.
  const auth = await requireCurrentSession('/admin/users');
  const model = await getAdminUsersData(auth.user.id);

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Admin console"
          title={model.title}
          description={model.description}
          summary="Role changes take effect on the user's next session read. You cannot change your own role."
          statusLabel="admin"
          statusTone="info"
          meta={[
            { label: 'Total users', value: String(model.totalCount) },
            { label: 'Admins', value: String(model.adminCount) },
            { label: 'Members', value: String(model.memberCount) },
          ]}
          actions={[
            { href: '/admin', label: 'Back to admin' },
            { href: '/admin/monitoring', label: 'Open monitoring' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label="Total users" value={String(model.totalCount)} detail="All registered accounts in the auth store." />
          <CompactStatCard label="Administrators" value={String(model.adminCount)} detail="Accounts with access to the admin console." />
          <CompactStatCard label="Members" value={String(model.memberCount)} detail="Standard accounts without admin access." />
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-card">
          <div className="analytics-card__header">
            <h2>Registered users</h2>
            <p>Grant or revoke administrator access. Changes are validated and applied server-side.</p>
          </div>
          <div className="analytics-card__body" style={{ overflowX: 'auto' }}>
            {model.rows.length === 0 ? (
              <p>No users are registered yet.</p>
            ) : (
              <table className="table-panel__table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Registered</th>
                    <th scope="col">Last login</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {model.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.email}</td>
                      <td>
                        <span className={`status-pill status-pill--${row.roleTone}`}>{row.roleLabel}</span>
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${row.statusTone}`}>{row.statusLabel}</span>
                      </td>
                      <td>{row.createdAtLabel}</td>
                      <td>{row.lastLoginLabel}</td>
                      <td>
                        {row.isSelf ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                            <span className="text-muted">Your account</span>
                            {row.isPending ? (
                              <form action={setUserStatusAction}>
                                <input type="hidden" name="userId" value={row.id} />
                                <input type="hidden" name="status" value="active" />
                                <button
                                  type="submit"
                                  className="button button--primary"
                                  aria-label={`Verify and activate your account (${row.email})`}
                                >
                                  {row.statusActionLabel}
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            <form action={setUserRoleAction}>
                              <input type="hidden" name="userId" value={row.id} />
                              <input type="hidden" name="role" value={row.nextRole} />
                              <button
                                type="submit"
                                className={`button ${row.isAdmin ? 'button--secondary' : 'button--primary'}`}
                                aria-label={`${row.nextRoleActionLabel} for ${row.email}`}
                              >
                                {row.nextRoleActionLabel}
                              </button>
                            </form>
                            <form action={setUserStatusAction}>
                              <input type="hidden" name="userId" value={row.id} />
                              <input type="hidden" name="status" value={row.nextStatus} />
                              <button
                                type="submit"
                                className={`button ${row.statusActionIsPositive ? 'button--primary' : 'button--secondary'}`}
                                aria-label={`${row.statusActionLabel} account for ${row.email}`}
                              >
                                {row.statusActionLabel}
                              </button>
                            </form>
                            <form action={forceLogoutUserAction}>
                              <input type="hidden" name="userId" value={row.id} />
                              <button
                                type="submit"
                                className="button button--ghost"
                                aria-label={`Force logout ${row.email}`}
                              >
                                Force logout
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-card">
          <div className="analytics-card__header">
            <h2>Recent role changes</h2>
            <p>Append-only audit trail of administrator role grants and revocations.</p>
          </div>
          <div className="analytics-card__body" style={{ overflowX: 'auto' }}>
            {model.recentEvents.length === 0 ? (
              <p>No role changes have been recorded yet.</p>
            ) : (
              <table className="table-panel__table">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Change</th>
                    <th scope="col">By</th>
                  </tr>
                </thead>
                <tbody>
                  {model.recentEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.createdAtLabel}</td>
                      <td>{event.summary}</td>
                      <td>{event.actorEmail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
