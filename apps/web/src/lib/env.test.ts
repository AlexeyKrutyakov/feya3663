import { afterEach, describe, expect, it } from 'vitest';

import { getWebEnv, webEnvSchema } from './env.js';

describe('webEnvSchema', () => {
  const original = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = original;
    }
  });

  it('parses a valid URL', () => {
    const result = webEnvSchema.parse({ NEXT_PUBLIC_API_URL: 'https://api.example.com' });
    expect(result.NEXT_PUBLIC_API_URL).toBe('https://api.example.com');
  });

  it('defaults to local api when the env is unset', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(getWebEnv().NEXT_PUBLIC_API_URL).toBe('http://localhost:3001');
  });

  it('rejects a non-URL value', () => {
    expect(() => webEnvSchema.parse({ NEXT_PUBLIC_API_URL: 'not-a-url' })).toThrow();
  });

  it('rejects a URL without a scheme', () => {
    expect(() => webEnvSchema.parse({ NEXT_PUBLIC_API_URL: 'api.example.com' })).toThrow();
  });

  it('rejects an empty value', () => {
    expect(() => webEnvSchema.parse({ NEXT_PUBLIC_API_URL: '' })).toThrow();
  });
});
