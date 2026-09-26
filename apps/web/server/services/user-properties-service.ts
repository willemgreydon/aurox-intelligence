import { toPublicUserProperties } from '@repo/api-contracts';
import { getUserProperties } from '@repo/db';
import { mapAccountUserProperties, type AccountUserPropertiesViewModel } from '../mappers/user-properties-mapper';

/**
 * Account read path for the user-properties surface:
 * query (getUserProperties) → strip admin-only block (toPublicUserProperties) →
 * mapper → view model. User-scoped; the caller passes the authenticated id.
 */
export async function getAccountUserPropertiesData(userId: string): Promise<AccountUserPropertiesViewModel> {
  const properties = await getUserProperties(userId);
  return mapAccountUserProperties(toPublicUserProperties(properties));
}
