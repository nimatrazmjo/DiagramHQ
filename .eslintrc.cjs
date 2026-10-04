const preset = require('./packages/config/eslint-preset.js');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ...preset,
  ignorePatterns: [
    '**/dist/**',
    '**/.next/**',
    '**/node_modules/**',
    '**/coverage/**',
    '**/next-env.d.ts',
    '**/test-results/**',
    '**/playwright-report/**',
  ],
};
