/**
 * Shared ESLint config for the DiagramHQ monorepo.
 * Kept intentionally lean: TypeScript correctness rules only. Framework-specific
 * linting (React hooks, Next) is layered per-app when those rules earn their cost.
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, browser: true, es2022: true },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
  },
  overrides: [
    {
      // NestJS DI resolves injected providers from runtime class references
      // (emitDecoratorMetadata). Type-only imports would elide those references
      // and break injection, so the type-import rule does not apply to Nest files.
      files: ['**/*.controller.ts', '**/*.module.ts', '**/*.service.ts', '**/*.resolver.ts'],
      rules: { '@typescript-eslint/consistent-type-imports': 'off' },
    },
  ],
};
