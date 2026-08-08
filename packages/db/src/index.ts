import { PrismaPg } from '@prisma/adapter-pg';

export { PrismaClient, Prisma } from './generated/prisma/client';
export type { PrismaClient as PrismaClientType } from './generated/prisma/client';

/**
 * Build a Prisma driver adapter for PostgreSQL (`@prisma/adapter-pg`).
 * Pass the result to `new PrismaClient({ adapter })` (Prisma 7 pattern, D27).
 */
export function createPgAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({ connectionString });
}
