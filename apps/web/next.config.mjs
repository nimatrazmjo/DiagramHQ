import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Pin the monorepo root so the 'standalone' output layout is deterministic
  // and matches the Docker COPY paths (avoids Next's inferred-root warning).
  outputFileTracingRoot: path.join(rootDir, '../../'),
};

export default nextConfig;
