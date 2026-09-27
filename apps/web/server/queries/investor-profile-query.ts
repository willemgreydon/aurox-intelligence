import type { InvestorProfile } from '@repo/api-contracts';
import { getInvestorProfileVersion, getLatestInvestorProfile } from '@repo/db';

/**
 * Query layer for investor profiles — gathers raw domain data from the DB
 * repository, user-scoped. No formatting here (that is the mapper's job).
 */
export async function getLatestInvestorProfileForUser(userId: string): Promise<InvestorProfile | null> {
  return getLatestInvestorProfile(userId);
}

export async function getInvestorProfileVersionForUser(
  userId: string,
  version: number,
): Promise<InvestorProfile | null> {
  return getInvestorProfileVersion(userId, version);
}
