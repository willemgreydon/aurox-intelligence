import { describe, expect, it } from 'vitest';
import * as aiMarketIntelligence from '@repo/ai-market-intelligence';

describe('worker ai intelligence exports', () => {
  it('exposes deriveMarketIntelligenceDigest for worker job', () => {
    expect(typeof aiMarketIntelligence.deriveMarketIntelligenceDigest).toBe('function');
  });
});
