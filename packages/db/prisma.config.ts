import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// The monorepo keeps a single .env at the repo root; dotenv's default
// lookup only checks the package cwd (packages/db).
config({ path: '../../.env' });
config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
