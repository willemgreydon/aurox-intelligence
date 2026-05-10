import { z } from 'zod';

export const macroProviderIdSchema = z.enum(['world-bank', 'ecb', 'fred', 'local-cache']);
export const macroFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'unknown']);
export const macroRegimeCategorySchema = z.enum([
  'inflation',
  'rates',
  'growth',
  'labor',
  'liquidity',
  'currency',
  'risk',
  'credit',
]);
export const macroFreshnessStateSchema = z.enum(['live', 'delayed', 'partial', 'stale', 'unavailable']);

export const macroSeriesPointSchema = z.object({
  provider: macroProviderIdSchema,
  seriesId: z.string().min(1),
  normalizedSeriesId: z.string().min(1),
  countryCode: z.string().min(2).max(16).optional(),
  region: z.string().max(120).optional(),
  title: z.string().min(1),
  value: z.number(),
  unit: z.string().max(80).optional(),
  frequency: macroFrequencySchema,
  period: z.string().min(1),
  observedAt: z.string(),
  publishedAt: z.string().optional(),
  revisedAt: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  raw: z.unknown().optional(),
});

export const macroSeriesSchema = z.object({
  provider: macroProviderIdSchema,
  seriesId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().optional(),
  frequency: macroFrequencySchema,
  geography: z.string().optional(),
  points: z.array(macroSeriesPointSchema),
  lastUpdated: z.string(),
  freshnessState: macroFreshnessStateSchema,
});

export const macroRegimeSignalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  score: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  category: macroRegimeCategorySchema,
  explanation: z.string().min(1),
  sourceSeriesIds: z.array(z.string()),
  updatedAt: z.string(),
});

export type MacroProviderId = z.infer<typeof macroProviderIdSchema>;
export type MacroFrequency = z.infer<typeof macroFrequencySchema>;
export type MacroFreshnessState = z.infer<typeof macroFreshnessStateSchema>;
export type MacroSeriesPoint = z.infer<typeof macroSeriesPointSchema>;
export type MacroSeries = z.infer<typeof macroSeriesSchema>;
export type MacroRegimeSignal = z.infer<typeof macroRegimeSignalSchema>;
export type MacroRegimeCategory = z.infer<typeof macroRegimeCategorySchema>;
