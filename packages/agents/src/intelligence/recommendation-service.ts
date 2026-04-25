import type { RecommendationInput, RecommendationResult } from './recommendation-types';
import { computeDeterministicRecommendation } from './recommendation-engine';

export interface RecommendationService {
  evaluate(input: RecommendationInput): RecommendationResult;
}

export const recommendationService: RecommendationService = {
  evaluate(input: RecommendationInput): RecommendationResult {
    return computeDeterministicRecommendation(input);
  },
};
