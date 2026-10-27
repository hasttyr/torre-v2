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

// The API reads its environment only through AppConfig, validated at start-up (US-005:AC2).
const API_READS_ENV = {
  object: 'process',
  property: 'env',
  message: 'Read configuration through AppConfig (apps/api/src/config), never process.env (US-005).',
};
// Raw SQL is always a tagged template, so every value travels as a parameter (US-007:AC6, CONVENTIONS.md §7).
const API_UNSAFE_SQL = ['$queryRawUnsafe', '$executeRawUnsafe'].map((property) => ({
  property,
  message: 'Use the tagged templates $queryRaw / $executeRaw (parameters, never string concatenation; US-007).',
}));
// Every transaction goes through DatabaseService.withTransaction, which sets the tenant context (US-007:AC3).
const API_OPENS_TRANSACTION = {
  property: '$transaction',
  message:
    'Open transactions with DatabaseService.withTransaction (apps/api/src/database), never $transaction (US-007).',
};

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
    // `no-restricted-properties` takes one list per file, so each API folder repeats the restrictions it keeps.
    {
      files: ['**/apps/api/src/**/*.ts'],
      ignores: ['**/apps/api/src/config/**', '**/apps/api/src/database/**', ...TEST_FILES],
      rules: { 'no-restricted-properties': ['error', API_READS_ENV, ...API_UNSAFE_SQL, API_OPENS_TRANSACTION] },
    },
    {
      files: ['**/apps/api/src/config/**/*.ts'],
      ignores: TEST_FILES,
      rules: { 'no-restricted-properties': ['error', ...API_UNSAFE_SQL, API_OPENS_TRANSACTION] },
    },
    {
      files: ['**/apps/api/src/database/**/*.ts'],
      ignores: TEST_FILES,
      rules: { 'no-restricted-properties': ['error', API_READS_ENV, ...API_UNSAFE_SQL] },
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
