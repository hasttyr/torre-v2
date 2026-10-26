// Dependency rules from ARCHITECTURE.md §5. Paths are not anchored to the repo root so the
// canary fixture under tools/fixtures/ exercises the same rules (tools/depcruise-canary.test.mjs).

/** Internal packages each domain package may import (ARCHITECTURE.md §5 graph). */
const ALLOWED = {
  core: [],
  rules: ['core'],
  ratings: ['rules', 'core'],
  pairing: ['rules', 'core'],
  standings: ['ratings', 'rules', 'core'],
  tournament: ['pairing', 'standings', 'ratings', 'rules', 'core'],
  contracts: ['core'],
  scheduler: ['core'],
};

const layering = Object.entries(ALLOWED).map(([pkg, allowed]) => ({
  name: `layering-${pkg}`,
  comment: `packages/${pkg} may only import: ${allowed.length ? allowed.join(', ') : 'no internal package'} (ARCHITECTURE.md §5)`,
  severity: 'error',
  from: { path: `(^|/)packages/${pkg}/src/` },
  to: {
    path: '(^|/)packages/([^/]+)/src/',
    pathNot: [`(^|/)packages/${pkg}/src/`, ...allowed.map((a) => `(^|/)packages/${a}/src/`)],
  },
}));

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Circular dependencies hide layering mistakes.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-no-framework',
      comment: 'packages/* must not import frameworks, databases or queues (ARCHITECTURE.md §5 rule 1).',
      severity: 'error',
      from: { path: '(^|/)packages/[^/]+/src/' },
      to: {
        path: '^(@nestjs|@prisma|prisma|pg|ioredis|bullmq|express|socket\\.io|vue|pinia|@vue|@tanstack)(/|$)',
      },
    },
    {
      name: 'domain-no-node-io',
      comment: 'packages/* must not use Node built-ins such as fs, net, http or crypto (ARCHITECTURE.md §5 rule 1).',
      severity: 'error',
      from: { path: '(^|/)packages/[^/]+/src/' },
      to: { dependencyTypes: ['core'] },
    },
    ...layering,
    {
      name: 'ratings-not-standings',
      comment: 'ratings must not import standings (ARCHITECTURE.md §5 rule 7).',
      severity: 'error',
      from: { path: '(^|/)packages/ratings/src/' },
      to: { path: '(^|/)packages/standings/src/' },
    },
    {
      name: 'testing-only-in-tests',
      comment: '@torre/testing is a devDependency: only test files may import it.',
      severity: 'error',
      from: {
        path: '(^|/)(packages|apps)/',
        pathNot: ['\\.(spec|test)\\.[cm]?[jt]s$', '(^|/)test/', '(^|/)packages/testing/'],
      },
      to: { path: '(^|/)packages/testing/src/' },
    },
    {
      name: 'web-not-api',
      comment: 'apps/web must not import apps/api (ARCHITECTURE.md §5 rule 5).',
      severity: 'error',
      from: { path: '(^|/)apps/web/' },
      to: { path: '(^|/)apps/api/' },
    },
    {
      name: 'not-to-unresolvable',
      comment: 'Every import must resolve (catches typos and missing dependencies).',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|coverage|node_modules)/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['@torre/source', 'import', 'types', 'default'],
      mainFields: ['module', 'main', 'types'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
