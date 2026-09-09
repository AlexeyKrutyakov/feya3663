import { afterEach, describe, expect, it } from 'vitest';

import { apiUrl } from './api.js';

describe('apiUrl', () => {
  const original = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = original;
    }
  });

  it('uses NEXT_PUBLIC_API_URL as the base', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    expect(apiUrl('/health')).toBe('https://api.example.com/health');
  });

  it('trims duplicate slashes at the seam', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/';
    expect(apiUrl('health')).toBe('https://api.example.com/health');
  });

  it('falls back to localhost:3001 when the env is unset', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(apiUrl('/health')).toBe('http://localhost:3001/health');
  });
});
