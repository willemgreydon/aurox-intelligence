import { mapAdminUsersViewModel, type AdminUsersViewModel } from '../mappers/admin-users-mapper';
import { getAdminUsersReadModel } from '../queries/admin-users-query';

/**
 * Orchestrates the admin user-management read path: query → mapper → view model.
 * `currentUserId` is threaded through so the mapper can flag the viewer's own
 * row (self role changes are blocked in the UI and the server action).
 */
export async function getAdminUsersData(currentUserId: string): Promise<AdminUsersViewModel> {
  const readModel = await getAdminUsersReadModel();
  return mapAdminUsersViewModel(readModel, currentUserId);
}
