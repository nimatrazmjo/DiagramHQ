import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    outputFileTracingRoot: path.join(rootDir, '../../'),
  },
  async redirects() {
    return [
      {
        source: '/canvas/:path*',
        destination: '/studio',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
