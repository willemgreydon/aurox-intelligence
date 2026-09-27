import type {
  DimensionVerdict,
  InstrumentOntology,
  InvestorProfile,
  KnowledgeLevel,
  LossBearingCapacity,
  RiskTolerance,
  SuitabilityResult,
} from '@repo/api-contracts';

export const SUITABILITY_POLICY_VERSION = 'suitability-2026.1';

const RISK_ORDER: RiskTolerance[] = ['very_low', 'low', 'moderate', 'high', 'very_high'];
const CAPACITY_ORDER: LossBearingCapacity[] = ['none', 'limited', 'moderate', 'substantial', 'full'];
const KNOWLEDGE_ORDER: KnowledgeLevel[] = ['none', 'basic', 'informed', 'advanced', 'expert'];

/** Coarse instrument risk band on the same 0..4 scale as risk tolerance. */
function instrumentRiskBand(instrument: InstrumentOntology): number {
  if (instrument.complexity === 'highly_complex') return 4;
  if (instrument.isDerivative || (instrument.leverage ?? 1) > 1) return 3;
  if (instrument.complexity === 'complex') return 3;
  if (instrument.assetClass === 'crypto' || instrument.assetClass === 'commodity') return 3;
  if (instrument.assetClass === 'equity' || instrument.assetClass === 'structured_product') return 2;
  if (instrument.assetClass === 'fund' || instrument.assetClass === 'multi_asset') return 1;
  return 0; // cash, money_market, fixed_income baseline
}

/** Minimum loss-bearing capacity index the instrument's downside implies. */
function requiredCapacityIndex(instrument: InstrumentOntology): number {
  const band = instrumentRiskBand(instrument);
  // Map a risk band to a minimum required capacity (ability to absorb loss).
  return Math.min(band, CAPACITY_ORDER.length - 1);
}

function requiredKnowledgeIndex(instrument: InstrumentOntology): number {
  if (instrument.complexity === 'highly_complex') return KNOWLEDGE_ORDER.indexOf('advanced');
  if (instrument.complexity === 'complex') return KNOWLEDGE_ORDER.indexOf('informed');
  return KNOWLEDGE_ORDER.indexOf('basic');
}

/**
 * Deterministic suitability assessment. There is NO numeric suitability score —
 * only per-dimension verdicts aggregated into a status. Missing hard-dimension
 * information yields `insufficient_information`, never a guess. A positive market
 * signal is irrelevant here and is never an input.
 */
export function evaluateSuitability(
  profile: InvestorProfile,
  instrument: InstrumentOntology,
  assessedAtIso: string,
): SuitabilityResult {
  const dimensions: DimensionVerdict[] = [];
  const missingInformation: string[] = [];
  const warnings: string[] = [];
  const reasons: string[] = [];

  // Risk (willingness) — HARD.
  if (profile.riskTolerance === null) {
    dimensions.push({ dimension: 'risk', verdict: 'unknown', reason: 'Risk tolerance not captured.', ruleId: 'SUIT-RISK' });
    missingInformation.push('riskTolerance');
  } else {
    const tolerance = RISK_ORDER.indexOf(profile.riskTolerance);
    const band = instrumentRiskBand(instrument);
    if (band <= tolerance) {
      dimensions.push({ dimension: 'risk', verdict: 'fit', reason: `Instrument risk band ${band} within tolerance ${tolerance}.`, ruleId: 'SUIT-RISK' });
    } else if (band === tolerance + 1) {
      dimensions.push({ dimension: 'risk', verdict: 'partial', reason: `Instrument risk band ${band} one step above tolerance ${tolerance}.`, ruleId: 'SUIT-RISK' });
    } else {
      dimensions.push({ dimension: 'risk', verdict: 'mismatch', reason: `Instrument risk band ${band} exceeds tolerance ${tolerance}.`, ruleId: 'SUIT-RISK' });
    }
  }

  // Loss-bearing capacity (ability) — HARD, independent of willingness.
  if (profile.lossBearingCapacity === null) {
    dimensions.push({ dimension: 'loss_capacity', verdict: 'unknown', reason: 'Loss-bearing capacity not captured.', ruleId: 'SUIT-CAPACITY' });
    missingInformation.push('lossBearingCapacity');
  } else {
    const capacity = CAPACITY_ORDER.indexOf(profile.lossBearingCapacity);
    const required = requiredCapacityIndex(instrument);
    if (capacity >= required) {
      dimensions.push({ dimension: 'loss_capacity', verdict: 'fit', reason: `Capacity ${capacity} covers required ${required}.`, ruleId: 'SUIT-CAPACITY' });
    } else if (capacity === required - 1) {
      dimensions.push({ dimension: 'loss_capacity', verdict: 'partial', reason: `Capacity ${capacity} one step below required ${required}.`, ruleId: 'SUIT-CAPACITY' });
    } else {
      dimensions.push({ dimension: 'loss_capacity', verdict: 'mismatch', reason: `Capacity ${capacity} below required ${required}.`, ruleId: 'SUIT-CAPACITY' });
    }
  }

  // Knowledge — HARD.
  if (profile.knowledge === null) {
    dimensions.push({ dimension: 'knowledge', verdict: 'unknown', reason: 'Knowledge not captured.', ruleId: 'SUIT-KNOWLEDGE' });
    missingInformation.push('knowledge');
  } else {
    const knowledge = KNOWLEDGE_ORDER.indexOf(profile.knowledge);
    const required = requiredKnowledgeIndex(instrument);
    if (knowledge >= required) {
      dimensions.push({ dimension: 'knowledge', verdict: 'fit', reason: `Knowledge ${knowledge} covers required ${required}.`, ruleId: 'SUIT-KNOWLEDGE' });
    } else {
      dimensions.push({ dimension: 'knowledge', verdict: 'mismatch', reason: `Knowledge ${knowledge} below required ${required}.`, ruleId: 'SUIT-KNOWLEDGE' });
    }
  }

  // Complexity — HARD (mirror of knowledge requirement, from the instrument side).
  dimensions.push({
    dimension: 'complexity',
    verdict: instrument.complexity === 'non_complex' ? 'fit' : 'partial',
    reason: `Instrument complexity: ${instrument.complexity}.`,
    ruleId: 'SUIT-COMPLEXITY',
  });

  // Soft dimensions — informational; contribute missing info but never alone force a status.
  if (profile.objective === null) {
    dimensions.push({ dimension: 'objective', verdict: 'unknown', reason: 'Investment objective not captured.', ruleId: 'SUIT-OBJECTIVE' });
    missingInformation.push('objective');
  }
  if (profile.horizon === null) {
    dimensions.push({ dimension: 'horizon', verdict: 'unknown', reason: 'Investment horizon not captured.', ruleId: 'SUIT-HORIZON' });
    missingInformation.push('horizon');
  }
  dimensions.push({ dimension: 'sustainability', verdict: 'unknown', reason: 'Instrument sustainability data not modelled in this pass.', ruleId: 'SUIT-ESG' });
  warnings.push('Liquidity, portfolio-fit and sustainability dimensions are seams and not yet evaluated.');

  const status = deriveStatus(dimensions);
  if (status === 'not_suitable') {
    reasons.push('At least one hard dimension (risk, loss capacity, knowledge) is a mismatch.');
  } else if (status === 'conditionally_suitable') {
    reasons.push('All hard dimensions pass but at least one is only a partial fit.');
  } else if (status === 'suitable') {
    reasons.push('All hard dimensions fit.');
  } else {
    reasons.push('Insufficient information on at least one hard dimension.');
  }

  return {
    status,
    dimensions,
    reasons,
    warnings,
    missingInformation,
    evidence: profile.provenance,
    ruleIds: dimensions.map((d) => d.ruleId).filter((id): id is string => id !== null),
    policyVersion: SUITABILITY_POLICY_VERSION,
    assessedAt: assessedAtIso,
    confidence: null,
  };
}

const HARD_DIMENSIONS = new Set(['risk', 'loss_capacity', 'knowledge', 'complexity']);

function deriveStatus(dimensions: DimensionVerdict[]): SuitabilityResult['status'] {
  const hard = dimensions.filter((d) => HARD_DIMENSIONS.has(d.dimension));
  if (hard.some((d) => d.verdict === 'unknown')) return 'insufficient_information';
  if (hard.some((d) => d.verdict === 'mismatch')) return 'not_suitable';
  if (dimensions.some((d) => d.verdict === 'partial')) return 'conditionally_suitable';
  return 'suitable';
}
