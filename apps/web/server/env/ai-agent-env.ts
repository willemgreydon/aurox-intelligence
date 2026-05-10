import { z } from 'zod';
import { resolveAiProviderConfig, type AiProviderName } from '@repo/providers';

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const aiAgentEnvSchema = z.object({
  OPENAI_API_KEY: optionalString,
  OPENAI_SIM_AGENT_MODEL: z.string().optional().default('gpt-4o-mini'),
});

export type AiAgentEnv = z.infer<typeof aiAgentEnvSchema>;

export type ResolvedAiAgentProvider =
  | {
      available: true;
      provider: AiProviderName;
      apiKey: string;
      fallbackProviderUsed: boolean;
      usingDeprecatedClaudeAlias: boolean;
    }
  | {
      available: false;
      provider: null;
      fallbackProviderUsed: boolean;
      usingDeprecatedClaudeAlias: boolean;
      reason: string;
    };

let cachedEnv: AiAgentEnv | null = null;

export function getAiAgentEnv(): AiAgentEnv {
  if (cachedEnv) return cachedEnv;

  cachedEnv = aiAgentEnvSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_SIM_AGENT_MODEL: process.env.OPENAI_SIM_AGENT_MODEL,
  });

  return cachedEnv;
}

export function hasOpenAiApiKey(): boolean {
  return Boolean(getAiAgentEnv().OPENAI_API_KEY);
}

export function getOpenAiSimAgentModel(): string {
  return getAiAgentEnv().OPENAI_SIM_AGENT_MODEL ?? 'gpt-4o-mini';
}

export function resolveAiAgentProviderConfig(): ResolvedAiAgentProvider {
  const resolved = resolveAiProviderConfig();
  if (!resolved.available) {
    return {
      available: false,
      provider: null,
      fallbackProviderUsed: resolved.fallbackProviderUsed,
      usingDeprecatedClaudeAlias: resolved.usingDeprecatedClaudeAlias,
      reason: resolved.reason,
    };
  }

  return {
    available: true,
    provider: resolved.provider,
    apiKey: resolved.apiKey,
    fallbackProviderUsed: resolved.fallbackProviderUsed,
    usingDeprecatedClaudeAlias: resolved.usingDeprecatedClaudeAlias,
  };
}
