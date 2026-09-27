import type { InstrumentOntology, InvestorProfile } from '@repo/api-contracts';

/** €N as EUR minor units (cents). Whole-euro helper for deterministic fixtures. */
export function eur(whole: number): { minorUnits: number; currency: 'EUR'; scale: 2 } {
  return { minorUnits: whole * 100, currency: 'EUR', scale: 2 };
}

/** €N.cc from explicit cents. */
export function eurCents(cents: number): { minorUnits: number; currency: 'EUR'; scale: 2 } {
  return { minorUnits: cents, currency: 'EUR', scale: 2 };
}

export const NON_COMPLEX_EQUITY: InstrumentOntology = {
  canonicalSymbol: 'AAPL',
  isin: 'US0378331005',
  name: 'Apple Inc.',
  assetClass: 'equity',
  instrumentType: 'common_share',
  productStructure: 'cash_instrument',
  complexity: 'non_complex',
  taxAssetClass: 'securities_capital_gain',
  issuerCountry: 'US',
  jurisdiction: 'US',
  currency: 'USD',
  tradingCurrency: 'USD',
  settlementCurrency: 'USD',
  isDerivative: false,
  leverage: null,
  fractionalSupported: true,
  regulatoryClassification: null,
  evidence: [],
};

export const COMPLEX_LEVERAGED_ETP: InstrumentOntology = {
  canonicalSymbol: 'BTC3L',
  isin: null,
  name: '3x Leveraged Bitcoin ETP',
  assetClass: 'crypto',
  instrumentType: 'etp',
  productStructure: 'structured_payoff',
  complexity: 'highly_complex',
  taxAssetClass: 'crypto',
  issuerCountry: 'DE',
  jurisdiction: 'DE',
  currency: 'EUR',
  tradingCurrency: 'EUR',
  settlementCurrency: 'EUR',
  isDerivative: true,
  leverage: 3,
  fractionalSupported: false,
  regulatoryClassification: null,
  evidence: [],
};

export function makeProfile(overrides: Partial<InvestorProfile> = {}): InvestorProfile {
  return {
    profileId: 'profile-1',
    investorRef: 'user-1',
    version: 1,
    effectiveDate: '2026-01-01',
    lastReviewedAt: null,
    clientCategory: 'retail',
    brokerClassification: null,
    taxResidency: 'AT',
    baseCurrency: 'EUR',
    financialSituation: {
      regularIncome: null,
      investableAssets: null,
      liabilities: null,
      liquidityReserveRequirement: null,
    },
    objective: 'growth',
    strategy: null,
    horizon: 'long',
    riskTolerance: 'high',
    lossBearingCapacity: 'substantial',
    knowledge: 'advanced',
    experience: 'extensive',
    instrumentExperience: {},
    sustainabilityPreferences: null,
    completeness: 1,
    provenance: [],
    ...overrides,
  };
}
