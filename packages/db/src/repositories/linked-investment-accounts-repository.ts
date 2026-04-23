import type { ConnectedInvestmentAccount } from '@repo/api-contracts';

const linkedAccounts: ConnectedInvestmentAccount[] = [];

export async function getLinkedInvestmentAccounts(): Promise<ConnectedInvestmentAccount[]> {
  return linkedAccounts;
}
