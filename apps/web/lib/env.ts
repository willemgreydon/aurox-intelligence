import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Stock Trend Prediction'),
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
  LOG_LEVEL: z.string().default('info'),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
});
