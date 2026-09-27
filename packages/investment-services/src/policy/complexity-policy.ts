import type { ExperienceLevel, InstrumentComplexity, KnowledgeLevel } from '@repo/api-contracts';
import { experienceLevelSchema, knowledgeLevelSchema } from '@repo/api-contracts';

/**
 * The minimum knowledge and experience an investor needs to understand an
 * instrument of a given complexity. This is the SINGLE source of truth shared by
 * the suitability and appropriateness engines, so the two can never disagree on
 * the threshold for the same instrument (they previously computed it
 * independently). Ordinal indices are derived from the contract enums.
 */
export const COMPLEXITY_REQUIREMENTS: Record<
  InstrumentComplexity,
  { knowledge: KnowledgeLevel; experience: ExperienceLevel }
> = {
  non_complex: { knowledge: 'basic', experience: 'none' },
  complex: { knowledge: 'informed', experience: 'limited' },
  highly_complex: { knowledge: 'advanced', experience: 'moderate' },
};

const KNOWLEDGE_ORDER = knowledgeLevelSchema.options;
const EXPERIENCE_ORDER = experienceLevelSchema.options;

export function knowledgeIndex(level: KnowledgeLevel): number {
  return KNOWLEDGE_ORDER.indexOf(level);
}

export function experienceIndex(level: ExperienceLevel): number {
  return EXPERIENCE_ORDER.indexOf(level);
}

export function requiredKnowledgeIndex(complexity: InstrumentComplexity): number {
  return KNOWLEDGE_ORDER.indexOf(COMPLEXITY_REQUIREMENTS[complexity].knowledge);
}

export function requiredExperienceIndex(complexity: InstrumentComplexity): number {
  return EXPERIENCE_ORDER.indexOf(COMPLEXITY_REQUIREMENTS[complexity].experience);
}
