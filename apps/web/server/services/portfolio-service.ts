import type { InvestPortfolioViewModel, PortfolioFilterState } from '@repo/api-contracts';
import { getPortfolioReadModel } from '../queries/portfolio-query';
import { mapInvestPortfolioViewModel } from '../mappers/portfolio-mapper';

export async function getInvestPortfolioData(
  filters?: Partial<PortfolioFilterState>,
): Promise<InvestPortfolioViewModel> {
  const readModel = await getPortfolioReadModel();
  return mapInvestPortfolioViewModel(readModel, filters);
}

