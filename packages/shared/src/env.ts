import { z } from 'zod';

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  MIS_API_URL: z.string().url(),
  MIS_LOGIN: z.string().min(1),
  MIS_PASSWORD: z.string().min(1),
  MIS_WEBHOOK_SECRET: z.string().min(16),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
