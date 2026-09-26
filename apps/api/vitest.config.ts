import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Vitest transforms TS via esbuild by default, which strips decorators
// without emitting the design:paramtypes metadata NestJS's DI and
// ValidationPipe depend on (emitDecoratorMetadata has no esbuild
// equivalent). SWC does emit it, so real Test.createTestingModule() /
// supertest integration tests resolve providers and DTO metatypes
// correctly instead of silently no-op-ing.
export default defineConfig({
  plugins: [swc.vite()],
});
