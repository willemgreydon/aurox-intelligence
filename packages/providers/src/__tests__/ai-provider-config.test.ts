import { afterEach, describe, expect, it } from 'vitest';
import { resolveAiProviderConfig } from '../config';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe('resolveAiProviderConfig', () => {
  afterEach(() => {
    resetEnv();
  });

  it('prefers ANTHROPIC_API_KEY over deprecated CLAUDE_FINANCE_API_KEY alias', () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-key';
    process.env.CLAUDE_FINANCE_API_KEY = 'legacy-key';
    process.env.AI_PRIMARY_PROVIDER = 'anthropic';
    process.env.AI_FALLBACK_PROVIDER = 'openai';

    const resolved = resolveAiProviderConfig();
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider).toBe('anthropic');
      expect(resolved.apiKey).toBe('anthropic-key');
      expect(resolved.usingDeprecatedClaudeAlias).toBe(false);
    }
  });

  it('uses CLAUDE_FINANCE_API_KEY alias when ANTHROPIC_API_KEY is missing', () => {
    process.env.CLAUDE_FINANCE_API_KEY = 'legacy-key';
    process.env.AI_PRIMARY_PROVIDER = 'anthropic';
    process.env.AI_FALLBACK_PROVIDER = 'openai';

    const resolved = resolveAiProviderConfig();
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider).toBe('anthropic');
      expect(resolved.apiKey).toBe('legacy-key');
      expect(resolved.usingDeprecatedClaudeAlias).toBe(true);
    }
  });

  it('falls back to openai when primary anthropic is unavailable', () => {
    process.env.AI_PRIMARY_PROVIDER = 'anthropic';
    process.env.AI_FALLBACK_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'openai-key';
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_FINANCE_API_KEY;

    const resolved = resolveAiProviderConfig();
    expect(resolved.available).toBe(true);
    if (resolved.available) {
      expect(resolved.provider).toBe('openai');
      expect(resolved.fallbackProviderUsed).toBe(true);
    }
  });

  it('returns degraded state when no provider keys exist', () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_FINANCE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.AI_PRIMARY_PROVIDER = 'anthropic';
    process.env.AI_FALLBACK_PROVIDER = 'openai';

    const resolved = resolveAiProviderConfig();
    expect(resolved.available).toBe(false);
    if (!resolved.available) {
      expect(resolved.reason).toBe('missing_all_keys');
    }
  });
});

