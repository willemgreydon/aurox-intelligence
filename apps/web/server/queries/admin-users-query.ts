import {
  listAuthUsers,
  listRecentAdminEvents,
  type AdminEventRecord,
  type AdminUserSummaryRecord,
} from '@repo/db';

export type AdminUsersReadModel = {
  users: AdminUserSummaryRecord[];
  recentEvents: AdminEventRecord[];
};

/**
 * Gathers the raw user list and recent admin audit events for the
 * user-management surface. Independent reads run in parallel; display shaping
 * happens in the mapper.
 */
export async function getAdminUsersReadModel(): Promise<AdminUsersReadModel> {
  const [users, recentEvents] = await Promise.all([listAuthUsers(), listRecentAdminEvents(25)]);
  return { users, recentEvents };
}
