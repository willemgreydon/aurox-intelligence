/**
 * Investment Services Intelligence — shared contracts (source of truth).
 *
 * This is the contract seam for a first-class Aurox domain that reasons about:
 *   Market → Instrument → Issuer → Investor → Portfolio → Suitability → Risk →
 *   Cost → Tax → Execution → Settlement → Custody → Regulation → Evidence →
 *   Decision.
 *
 * This pass implements the P0 core (money, provenance, instrument ontology,
 * investor profile, suitability/appropriateness, cost, and Austrian tax). Later
 * bounded contexts (issuer/credit, custody, resolution, corporate actions, …)
 * attach here without reshaping these contracts.
 */
export * from './money';
export * from './provenance';
export * from './instrument';
export * from './investor';
export * from './suitability';
export * from './cost';
export * from './tax';
