import { describe, expect, it } from 'vitest';
import { buildNoOpenPositionReason, normalizeAgentError, snapToStep } from './simulation-form-helpers';

describe('simulation-form-helpers', () => {
  it('snaps sell percentage values to whole-share steps', () => {
    expect(snapToStep(2.5, 1, 1)).toBe(3);
    expect(snapToStep(0.2, 1, 1)).toBe(1);
  });

  it('keeps btc micro step precision', () => {
    expect(snapToStep(0.00094, 0.0001, 0.0001)).toBe(0.0009);
    expect(snapToStep(0.00104, 0.0001, 0.0001)).toBe(0.001);
  });

  it('builds disabled sell reason with symbol', () => {
    expect(buildNoOpenPositionReason('AMD')).toBe('No open AMD position is available to sell.');
  });

  it('normalizes quota provider errors to safe hold message', () => {
    const fallback = 'AI provider unavailable. The agent defaulted to HOLD for safety.';
    expect(normalizeAgentError('insufficient_quota at provider', fallback)).toBe(fallback);
    expect(
      normalizeAgentError(
        '429 quota exceeded. See https://platform.openai.com/docs/errors for details.',
        fallback,
      ),
    ).toBe(fallback);
    expect(normalizeAgentError('some other error', fallback)).toBe('some other error');
  });
});
