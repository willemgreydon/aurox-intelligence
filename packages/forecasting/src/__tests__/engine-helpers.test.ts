import { describe, expect, it } from 'vitest';

import { calculateConfidenceScore } from '../engine/confidence-model';
import { generateScenarios } from '../engine/scenario-generator';
import { buildRiskFactors } from '../engine/risk-model';
import { buildDriverSummary } from '../explainability/driver-summary';
import { buildInvalidationFactors } from '../explainability/invalidation-factors';

describe('calculateConfidenceScore', () => {
  it('scales signal count into [0, 1]', () => {
    expect(calculateConfidenceScore(0)).toBe(0);
    expect(calculateConfidenceScore(5)).toBe(0.5);
    expect(calculateConfidenceScore(10)).toBe(1);
  });

  it('clamps out-of-range counts', () => {
    expect(calculateConfidenceScore(15)).toBe(1);
    expect(calculateConfidenceScore(-3)).toBe(0);
  });
});

describe('deterministic explainability/scenario helpers', () => {
  it('generateScenarios returns the fixed base scenario', () => {
    expect(generateScenarios()).toEqual(['base']);
  });

  it('buildRiskFactors returns a stable list', () => {
    expect(buildRiskFactors()).toEqual(['provider freshness', 'macro regime change']);
  });

  it('buildInvalidationFactors returns a stable list', () => {
    expect(buildInvalidationFactors()).toEqual(['trend reversal', 'unexpected policy shock']);
  });

  it('buildDriverSummary joins drivers, empty for no drivers', () => {
    expect(buildDriverSummary(['trend', 'momentum'])).toBe('trend, momentum');
    expect(buildDriverSummary([])).toBe('');
  });
});
