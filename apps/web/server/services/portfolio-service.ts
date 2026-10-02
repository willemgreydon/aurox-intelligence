import type { InvestPortfolioViewModel, PortfolioFilterState } from '@repo/api-contracts';
import { getLatestInvestorProfileForUser } from '../queries/investor-profile-query';
import { getPortfolioReadModel } from '../queries/portfolio-query';
import { mapInvestPortfolioViewModel } from '../mappers/portfolio-mapper';

export async function getInvestPortfolioData(
  filters?: Partial<PortfolioFilterState>,
): Promise<InvestPortfolioViewModel> {
  const readModel = await getPortfolioReadModel();
  const userId = readModel.workstation.session?.userId ?? null;
  const investorProfile = userId ? await getLatestInvestorProfileForUser(userId).catch(() => null) : null;
  return mapInvestPortfolioViewModel(readModel, filters, investorProfile?.taxResidency ?? null);
}
