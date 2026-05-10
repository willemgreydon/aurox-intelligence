export {};
import { z } from 'zod';

export const worldBankMetaSchema = z.array(
  z.object({
    page: z.number().optional(),
    pages: z.number().optional(),
    per_page: z.union([z.number(), z.string()]).optional(),
    total: z.number().optional(),
  }),
);

export const worldBankPointSchema = z.object({
  date: z.string(),
  value: z.number().nullable(),
  indicator: z.object({
    id: z.string().optional(),
    value: z.string().optional(),
  }).optional(),
  country: z.object({
    id: z.string().optional(),
    value: z.string().optional(),
  }).optional(),
});

export const fredObservationSchema = z.object({
  date: z.string(),
  value: z.string(),
  realtime_start: z.string().optional(),
  realtime_end: z.string().optional(),
});

export const fredResponseSchema = z.object({
  observations: z.array(fredObservationSchema),
});
