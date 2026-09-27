import type {
  AppropriatenessResult,
  ExperienceLevel,
  InstrumentOntology,
  InvestorProfile,
  KnowledgeLevel,
} from '@repo/api-contracts';

export const APPROPRIATENESS_POLICY_VERSION = 'appropriateness-2026.1';

const KNOWLEDGE_ORDER: KnowledgeLevel[] = ['none', 'basic', 'informed', 'advanced', 'expert'];
const EXPERIENCE_ORDER: ExperienceLevel[] = ['none', 'limited', 'moderate', 'extensive'];

/**
 * Appropriateness is the DIFFERENT question from suitability: does the investor
 * have enough knowledge and experience to understand this instrument type and
 * its risks — independent of whether it fits their goals or finances.
 *
 * For non-complex instruments, appropriateness is `not_required` (execution-only
 * is permissible). For complex instruments it is required, and missing
 * knowledge/experience yields `insufficient_information`, never a pass.
 */
export function evaluateAppropriateness(
  profile: InvestorProfile,
  instrument: InstrumentOntology,
  assessedAtIso: string,
): AppropriatenessResult {
  const base = {
    reasons: [] as string[],
    warnings: [] as string[],
    missingInformation: [] as string[],
    evidence: profile.provenance,
    ruleIds: ['APPROP-KNOWLEDGE-EXPERIENCE'],
    policyVersion: APPROPRIATENESS_POLICY_VERSION,
    assessedAt: assessedAtIso,
  };

  if (instrument.complexity === 'non_complex') {
    return {
      ...base,
      status: 'not_required',
      reasons: ['Instrument is non-complex; an appropriateness test is not required.'],
    };
  }

  if (profile.knowledge === null || profile.experience === null) {
    const missing: string[] = [];
    if (profile.knowledge === null) missing.push('knowledge');
    if (profile.experience === null) missing.push('experience');
    return {
      ...base,
      status: 'insufficient_information',
      missingInformation: missing,
      reasons: ['Cannot assess appropriateness without knowledge and experience.'],
    };
  }

  const knowledge = KNOWLEDGE_ORDER.indexOf(profile.knowledge);
  const experience = EXPERIENCE_ORDER.indexOf(profile.experience);
  const requiredKnowledge = instrument.complexity === 'highly_complex'
    ? KNOWLEDGE_ORDER.indexOf('advanced')
    : KNOWLEDGE_ORDER.indexOf('informed');
  const requiredExperience = instrument.complexity === 'highly_complex'
    ? EXPERIENCE_ORDER.indexOf('moderate')
    : EXPERIENCE_ORDER.indexOf('limited');

  const knowledgeOk = knowledge >= requiredKnowledge;
  const experienceOk = experience >= requiredExperience;

  if (knowledgeOk && experienceOk) {
    return {
      ...base,
      status: 'appropriate',
      reasons: [`Knowledge and experience meet the requirement for a ${instrument.complexity} instrument.`],
    };
  }

  const reasons: string[] = [];
  if (!knowledgeOk) reasons.push('Knowledge below the level required for this instrument complexity.');
  if (!experienceOk) reasons.push('Experience below the level required for this instrument complexity.');
  return { ...base, status: 'not_appropriate', reasons };
}
