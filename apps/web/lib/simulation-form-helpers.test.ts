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

  it('normalizes quota provider errors to safe hold message (no raw URL leaks)', () => {
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

  it('maps a broad set of provider/transport failures to the safe hold message', () => {
    const fallback = 'AI provider unavailable. The agent defaulted to HOLD for safety.';
    for (const raw of [
      'Anthropic API returned 529 overloaded_error',
      'OpenAI request failed: 503 Service Unavailable',
      'Error: fetch failed (ENOTFOUND api.openai.com)',
      'request timed out after 30000ms',
      'invalid_api_key: incorrect API key provided',
      '502 Bad Gateway',
      'model_not_found',
    ]) {
      expect(normalizeAgentError(raw, fallback)).toBe(fallback);
    }
  });

  it('keeps actionable domain errors visible (does not swallow them as provider failures)', () => {
    const fallback = 'AI provider unavailable. The agent defaulted to HOLD for safety.';
    expect(normalizeAgentError('Insufficient fictive cash for this order.', fallback)).toBe(
      'Insufficient fictive cash for this order.',
    );
    expect(normalizeAgentError('No open AMD position is available to sell.', fallback)).toBe(
      'No open AMD position is available to sell.',
    );
  });
});
