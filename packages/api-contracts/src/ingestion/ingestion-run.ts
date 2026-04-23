import { z } from 'zod';

export const ingestionRunSchema = z.object({
  id: z.string(),
  source: z.string(),
  status: z.enum(['pending', 'running', 'succeeded', 'failed']),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
});

export type IngestionRun = z.infer<typeof ingestionRunSchema>;
