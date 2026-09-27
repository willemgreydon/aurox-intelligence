import type { InvestorProfile } from '@repo/api-contracts';

/**
 * Display-ready investor profile read model. Risk tolerance (willingness) and
 * loss-bearing capacity (ability) are surfaced as SEPARATE fields — the mapper
 * must never merge them into a single "risk" value.
 */
export type InvestorProfileViewModel = {
  hasProfile: boolean;
  version: number | null;
  effectiveDate: string | null;
  clientCategory: string | null;
  baseCurrency: string | null;
  taxResidency: string | null;
  objective: string | null;
  horizon: string | null;
  riskTolerance: string | null;
  lossBearingCapacity: string | null;
  knowledge: string | null;
  experience: string | null;
  completenessPercent: string;
};

const EMPTY: InvestorProfileViewModel = {
  hasProfile: false,
  version: null,
  effectiveDate: null,
  clientCategory: null,
  baseCurrency: null,
  taxResidency: null,
  objective: null,
  horizon: null,
  riskTolerance: null,
  lossBearingCapacity: null,
  knowledge: null,
  experience: null,
  completenessPercent: '0%',
};

/** Pure mapper: raw domain profile → display-ready view model. No I/O. */
export function mapInvestorProfile(profile: InvestorProfile | null): InvestorProfileViewModel {
  if (!profile) {
    return EMPTY;
  }
  return {
    hasProfile: true,
    version: profile.version,
    effectiveDate: profile.effectiveDate,
    clientCategory: profile.clientCategory,
    baseCurrency: profile.baseCurrency,
    taxResidency: profile.taxResidency,
    objective: profile.objective,
    horizon: profile.horizon,
    riskTolerance: profile.riskTolerance,
    lossBearingCapacity: profile.lossBearingCapacity,
    knowledge: profile.knowledge,
    experience: profile.experience,
    completenessPercent: `${Math.round(profile.completeness * 100)}%`,
  };
}
