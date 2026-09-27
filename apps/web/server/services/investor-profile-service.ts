import { getLatestInvestorProfileForUser } from '../queries/investor-profile-query';
import { mapInvestorProfile, type InvestorProfileViewModel } from '../mappers/investor-profile-mapper';

/**
 * Service layer: orchestrates the investor-profile query + mapper into a
 * route-facing read model. User-scoped and never cached across users.
 */
export async function getInvestorProfileReadModel(userId: string): Promise<InvestorProfileViewModel> {
  const profile = await getLatestInvestorProfileForUser(userId);
  return mapInvestorProfile(profile);
}
