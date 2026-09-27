import { z } from 'zod';
import { investmentEvidenceSchema } from './provenance';
import { taxAssetClassSchema } from './tax';

/**
 * Instrument ontology — three ORTHOGONAL dimensions, deliberately not collapsed:
 *   - assetClass:      the economic exposure family
 *   - instrumentType:  the concrete legal instrument
 *   - productStructure: how the payoff/ownership is wrapped
 * A leveraged crypto ETP, a plain share and a government bond can share an
 * assetClass while differing sharply on the other two axes.
 */
export const investmentAssetClassSchema = z.enum([
  'equity',
  'fixed_income',
  'fund',
  'money_market',
  'commodity',
  'crypto',
  'cash',
  'derivative',
  'structured_product',
  'multi_asset',
]);
export type InvestmentAssetClass = z.infer<typeof investmentAssetClassSchema>;

export const instrumentTypeSchema = z.enum([
  'common_share',
  'preferred_share',
  'government_bond',
  'corporate_bond',
  'etf',
  'etc',
  'etn',
  'etp',
  'mutual_fund',
  'certificate',
  'structured_note',
  'option',
  'future',
  'forward',
  'swap',
  'warrant',
  'convertible_bond',
  'money_market_instrument',
  'commodity_spot',
  'crypto_asset',
  'stablecoin',
  'tokenized_security',
  'deposit',
  'cash',
]);
export type InstrumentType = z.infer<typeof instrumentTypeSchema>;

export const productStructureSchema = z.enum([
  'cash_instrument',
  'fund_wrapper',
  'derivative_contract',
  'structured_payoff',
  'tokenized',
  'deposit_claim',
]);
export type ProductStructure = z.infer<typeof productStructureSchema>;

/** MiFID-style complexity band — drives the appropriateness engine. */
export const instrumentComplexitySchema = z.enum(['non_complex', 'complex', 'highly_complex']);
export type InstrumentComplexity = z.infer<typeof instrumentComplexitySchema>;

/**
 * Canonical instrument profile for the Investment Services domain. This EXTENDS
 * (does not replace) the existing minimal `assetSchema`; it is keyed by the same
 * canonical symbol so the two can be joined without duplicating identity.
 */
export const instrumentOntologySchema = z.object({
  canonicalSymbol: z.string(),
  isin: z.string().nullable(),
  name: z.string(),
  assetClass: investmentAssetClassSchema,
  instrumentType: instrumentTypeSchema,
  productStructure: productStructureSchema,
  complexity: instrumentComplexitySchema,
  taxAssetClass: taxAssetClassSchema.nullable(),
  issuerCountry: z.string().nullable(),
  jurisdiction: z.string().nullable(),
  currency: z.string().nullable(),
  tradingCurrency: z.string().nullable(),
  settlementCurrency: z.string().nullable(),
  isDerivative: z.boolean(),
  leverage: z.number().nullable(),
  fractionalSupported: z.boolean().nullable(),
  regulatoryClassification: z.string().nullable(),
  evidence: z.array(investmentEvidenceSchema),
});
export type InstrumentOntology = z.infer<typeof instrumentOntologySchema>;
