import path from 'node:path';
import swc from 'unplugin-swc';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Vitest transforms TS via esbuild by default, which strips decorators
// without emitting the design:paramtypes metadata NestJS's DI and
// ValidationPipe depend on (emitDecoratorMetadata has no esbuild
// equivalent). SWC does emit it, so real Test.createTestingModule() /
// supertest integration tests resolve providers and DTO metatypes
// correctly instead of silently no-op-ing.
export default defineConfig(({ mode }) => ({
  plugins: [swc.vite()],
  test: {
    fileParallelism: false,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: loadEnv(mode, path.resolve(__dirname, '../..'), ''),
  },
}));

