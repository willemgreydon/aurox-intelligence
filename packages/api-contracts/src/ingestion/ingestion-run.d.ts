import { z } from 'zod';
export declare const ingestionRunSchema: z.ZodObject<{
    id: z.ZodString;
    source: z.ZodString;
    status: z.ZodEnum<{
        pending: "pending";
        running: "running";
        succeeded: "succeeded";
        failed: "failed";
    }>;
    startedAt: z.ZodString;
    completedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type IngestionRun = z.infer<typeof ingestionRunSchema>;
//# sourceMappingURL=ingestion-run.d.ts.map