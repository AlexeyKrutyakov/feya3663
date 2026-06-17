import { describe, it, expect } from 'vitest';
import { PrismaClient, Prisma, createPgAdapter } from './index';

describe('@feya/db', () => {
  it('re-exports PrismaClient and Prisma namespace', () => {
    expect(typeof PrismaClient).toBe('function');
    expect(Prisma).toBeDefined();
  });

  it('createPgAdapter builds a pg driver adapter', () => {
    const adapter = createPgAdapter('postgresql://user:pass@localhost:5432/feya?schema=public');
    expect(adapter).toBeDefined();
    expect(adapter.provider).toBe('postgres');
  });
});
