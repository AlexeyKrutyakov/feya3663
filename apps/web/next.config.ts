import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone tracing creates symlinks, which fails without Windows dev-mode
  // privileges — enable it only in the Docker build (NEXT_OUTPUT=standalone).
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
};

export default nextConfig;
