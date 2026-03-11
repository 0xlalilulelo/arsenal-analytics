import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mro/core', '@mro/db', '@mro/tokens'],
  experimental: {
    reactCompiler: false,
  },
};

export default nextConfig;
