import { describe, it, expect } from 'vitest';
import { apiEnvSchema } from './env.js';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  MIS_API_URL: 'https://crmexchange.1denta.ru',
  MIS_LOGIN: 'feya3663@yandex.ru',
  MIS_PASSWORD: 'secret',
  MIS_WEBHOOK_SECRET: 'supersecrettoken1234',
};

describe('apiEnvSchema', () => {
  it('parses valid env with defaults', () => {
    const result = apiEnvSchema.parse(validEnv);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3001);
    expect(result.DATABASE_URL).toBe(validEnv.DATABASE_URL);
  });

  it('coerces PORT from string', () => {
    const result = apiEnvSchema.parse({ ...validEnv, PORT: '4000' });
    expect(result.PORT).toBe(4000);
  });

  it('rejects missing DATABASE_URL', () => {
    const { DATABASE_URL: _, ...rest } = validEnv;
    expect(() => apiEnvSchema.parse(rest)).toThrow();
  });

  it('rejects short WEBHOOK_SECRET', () => {
    expect(() => apiEnvSchema.parse({ ...validEnv, MIS_WEBHOOK_SECRET: 'short' })).toThrow();
  });
});
