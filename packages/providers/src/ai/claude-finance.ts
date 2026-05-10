import { z } from 'zod';
import { getClaudeFinanceApiKey, isClaudeFinanceProviderEnabled } from '../config';

export type ClaudeFinanceProviderInput = {
  assetId: string;
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'macro';
  contextSummary?: string;
};

export interface ClaudeFinanceProvider {
  readonly key: 'claude-finance';
  isConfigured(): boolean;
  analyze(input: ClaudeFinanceProviderInput): Promise<ClaudeFinanceAnalysis>;
}

const claudeFinanceAnalysisSchema = z.object({
  assetId: z.string().min(1),
  symbol: z.string().min(1),
  assetClass: z.enum(['stock', 'etf', 'crypto', 'macro']),
  summary: z.string().min(1),
  bullishFactors: z.array(z.string()),
  bearishFactors: z.array(z.string()),
  riskFlags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reasoningTrace: z.array(z.string()),
  timestamp: z.string(),
  degraded: z.boolean().default(false),
  degradedReason: z.string().optional(),
});

export type ClaudeFinanceAnalysis = z.infer<typeof claudeFinanceAnalysisSchema>;

function fallbackAnalysis(input: ClaudeFinanceProviderInput, reason: string): ClaudeFinanceAnalysis {
  return claudeFinanceAnalysisSchema.parse({
    assetId: input.assetId,
    symbol: input.symbol,
    assetClass: input.assetClass,
    summary: 'Claude Finance provider unavailable. Falling back to deterministic intelligence only.',
    bullishFactors: [],
    bearishFactors: [],
    riskFlags: ['PROVIDER_UNAVAILABLE'],
    confidence: 0,
    reasoningTrace: [reason],
    timestamp: new Date().toISOString(),
    degraded: true,
    degradedReason: reason,
  });
}

class OptionalClaudeFinanceProvider implements ClaudeFinanceProvider {
  readonly key = 'claude-finance' as const;

  isConfigured(): boolean {
    return isClaudeFinanceProviderEnabled() && Boolean(getClaudeFinanceApiKey());
  }

  async analyze(input: ClaudeFinanceProviderInput): Promise<ClaudeFinanceAnalysis> {
    if (!isClaudeFinanceProviderEnabled()) {
      return fallbackAnalysis(input, 'ANTHROPIC_PROVIDER_ENABLED=false');
    }

    const key = getClaudeFinanceApiKey();
    if (!key) {
      return fallbackAnalysis(input, 'Missing ANTHROPIC_API_KEY (or deprecated CLAUDE_FINANCE_API_KEY alias)');
    }

    // Provider hook intentionally returns a deterministic, explainable placeholder
    // unless an approved upstream Claude Finance endpoint is configured.
    return claudeFinanceAnalysisSchema.parse({
      assetId: input.assetId,
      symbol: input.symbol,
      assetClass: input.assetClass,
      summary: `${input.symbol} analysis placeholder from optional Claude Finance provider.`,
      bullishFactors: [],
      bearishFactors: [],
      riskFlags: [],
      confidence: 0.35,
      reasoningTrace: [
        'Provider key detected.',
        'No execution pathway exists in this provider.',
        'Result remains advisory and simulation-safe only.',
      ],
      timestamp: new Date().toISOString(),
      degraded: false,
    });
  }
}

export function getClaudeFinanceProvider(): ClaudeFinanceProvider {
  return new OptionalClaudeFinanceProvider();
}

export function getClaudeFinanceProviderAvailability(): { enabled: boolean; configured: boolean; reason: string | null } {
  const enabled = isClaudeFinanceProviderEnabled();
  const configured = Boolean(getClaudeFinanceApiKey());
  if (!enabled) {
    return { enabled, configured: false, reason: 'ANTHROPIC_PROVIDER_ENABLED=false' };
  }
  if (!configured) {
    return { enabled, configured, reason: 'Missing ANTHROPIC_API_KEY (or deprecated CLAUDE_FINANCE_API_KEY alias)' };
  }
  return { enabled, configured, reason: null };
}
