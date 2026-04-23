import { z } from 'zod';
import { freshnessStateSchema, routeStatusSchema, sentimentStateSchema } from '../market/market';
export const insightFactorSchema = z.object({
    key: z.string(),
    label: z.string(),
    value: z.string(),
    impact: sentimentStateSchema,
    confidence: z.number().min(0).max(1),
});
export const riskFlagSchema = z.object({
    key: z.string(),
    label: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    detail: z.string(),
});
export const insightProvenanceSchema = z.object({
    generatedAt: z.string(),
    modelMode: z.enum(['heuristic', 'llm']),
    sourceSummary: z.string(),
    freshnessState: freshnessStateSchema,
    supportingSources: z.array(z.string()),
});
export const marketInsightSummarySchema = z.object({
    assetId: z.string(),
    symbol: z.string(),
    headline: z.string(),
    summary: z.string(),
    stance: sentimentStateSchema,
    confidence: z.number().min(0).max(1),
    whatChanged: z.string(),
    factors: z.array(insightFactorSchema),
    riskFlags: z.array(riskFlagSchema),
    provenance: insightProvenanceSchema,
});
export const marketIntelligenceDigestSchema = z.object({
    title: z.string(),
    status: routeStatusSchema,
    freshnessState: freshnessStateSchema,
    generatedAt: z.string().nullable(),
    summary: z.string(),
    marketPulse: z.string(),
    assetInsights: z.array(marketInsightSummarySchema),
    emptyStateMessage: z.string().nullable(),
});
