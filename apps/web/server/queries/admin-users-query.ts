import {
  listAuthUsers,
  listRecentAdminEvents,
  listUserPropertiesAdminSummaries,
  type AdminEventRecord,
  type AdminUserSummaryRecord,
  type UserPropertiesAdminSummary,
} from '@repo/db';

export type AdminUsersReadModel = {
  users: AdminUserSummaryRecord[];
  recentEvents: AdminEventRecord[];
  /** User-properties analytics keyed by user id; absent for users with no row. */
  propertiesByUserId: Map<string, UserPropertiesAdminSummary>;
};

/**
 * Gathers the raw user list and recent admin audit events for the
 * user-management surface. Independent reads run in parallel; the batched
 * user-properties summary is fetched once the user ids are known (a single
 * `IN (…)` query — no N+1). Display shaping happens in the mapper.
 */
export async function getAdminUsersReadModel(): Promise<AdminUsersReadModel> {
  const [users, recentEvents] = await Promise.all([listAuthUsers(), listRecentAdminEvents(25)]);
  const propertiesByUserId = await listUserPropertiesAdminSummaries(users.map((user) => user.id));
  return { users, recentEvents, propertiesByUserId };
}
