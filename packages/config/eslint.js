// Shared ESLint flat config for the Torre monorepo (US-002, ARCHITECTURE.md §3.1 and §5).
// Usage from the repository root:
//   import { torreConfig } from '@torre/config/eslint';
//   export default torreConfig({ tsconfigRootDir: import.meta.dirname });
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.ts', '**/*.mts', '**/*.cts'];
const JS_FILES = ['**/*.js', '**/*.mjs', '**/*.cjs'];
const TEST_FILES = ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts', '**/*.test.mjs'];
// Not anchored to the root so the lint fixtures under tools/fixtures/lint exercise the same rules.
const DOMAIN_FILES = ['**/packages/*/src/**/*.ts'];

const NODE_GLOBALS = {
  console: 'readonly',
  process: 'readonly',
  URL: 'readonly',
  Buffer: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  structuredClone: 'readonly',
  performance: 'readonly',
};

// Node built-ins that perform I/O or provide entropy: forbidden in the pure domain (ARCHITECTURE.md §5 rule 1).
const NODE_IO_MODULES = [
  'fs',
  'fs/promises',
  'net',
  'http',
  'https',
  'http2',
  'child_process',
  'crypto',
  'os',
  'dgram',
  'dns',
  'tls',
  'cluster',
  'worker_threads',
  'readline',
  'process',
];

/**
 * @param {{ tsconfigRootDir: string, ignores?: string[] }} options
 */
export function torreConfig({ tsconfigRootDir, ignores = [] }) {
  return defineConfig(
    {
      ignores: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        'docs/**',
        'reports/**',
        '.tools/**',
        'tools/fixtures/**',
        // Prisma Client, generated on install (US-007).
        '**/apps/api/src/database/generated/**',
        ...ignores,
      ],
    },
    js.configs.recommended,
    {
      files: TS_FILES,
      extends: [tseslint.configs.recommendedTypeChecked],
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': [
          'error',
          { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
        ],
        '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'separate-type-imports' }],
        '@typescript-eslint/no-import-type-side-effects': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      },
    },
    {
      files: TEST_FILES,
      rules: {
        // Tests may assert presence with `!` (CLAUDE.md rule 3).
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      files: DOMAIN_FILES,
      ignores: TEST_FILES,
      rules: {
        'no-restricted-globals': [
          'error',
          { name: 'process', message: 'The domain has no environment: pass values as parameters (CLAUDE.md rule 2).' },
        ],
        'no-restricted-syntax': [
          'error',
          {
            selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
            message: 'Date.now() is forbidden in the domain: receive the time as a parameter (BR-GEN-01).',
          },
          {
            selector: "NewExpression[callee.name='Date'][arguments.length=0]",
            message: 'new Date() without arguments reads the clock: receive the time as a parameter (BR-GEN-01).',
          },
          {
            selector: "MemberExpression[object.name='Math'][property.name='random']",
            message: 'Math.random() is forbidden in the domain: use the seeded PRNG of @torre/core (CLAUDE.md rule 2).',
          },
        ],
        'no-restricted-imports': [
          'error',
          {
            paths: NODE_IO_MODULES.flatMap((m) => [
              { name: m, message: 'Node I/O is forbidden in the domain (ARCHITECTURE.md §5).' },
              { name: `node:${m}`, message: 'Node I/O is forbidden in the domain (ARCHITECTURE.md §5).' },
            ]),
          },
        ],
      },
    },
    {
      // The API reads its environment only through AppConfig, validated at start-up (US-005:AC2).
      files: ['**/apps/api/src/**/*.ts'],
      ignores: ['**/apps/api/src/config/**', ...TEST_FILES],
      rules: {
        'no-restricted-properties': [
          'error',
          {
            object: 'process',
            property: 'env',
            message: 'Read configuration through AppConfig (apps/api/src/config), never process.env (US-005).',
          },
        ],
      },
    },
    {
      files: JS_FILES,
      extends: [tseslint.configs.disableTypeChecked],
      languageOptions: { globals: NODE_GLOBALS },
    },
    {
      files: ['**/*.cjs'],
      languageOptions: {
        sourceType: 'commonjs',
        globals: { ...NODE_GLOBALS, module: 'writable', require: 'readonly' },
      },
    },
  );
}
