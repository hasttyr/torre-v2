import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
// Domain packages may depend only on other @torre packages and Zod (US-011:AC4, ARCHITECTURE.md §5).
const ALLOWED_RUNTIME = /^(@torre\/.+|zod)$/;
// contracts has its own, stricter case below.
const domain = readdirSync(join(root, 'packages')).filter((p) => !['config', 'testing', 'contracts'].includes(p));
const dependenciesOf = (pkg) =>
  Object.keys(JSON.parse(readFileSync(join(root, 'packages', pkg, 'package.json'), 'utf8')).dependencies ?? {});

describe('domain package dependencies (US-011)', () => {
  it.each(domain)('[US-011:AC4] should keep packages/%s free of external runtime dependencies', (pkg) => {
    const manifest = JSON.parse(readFileSync(join(root, 'packages', pkg, 'package.json'), 'utf8'));

    expect(Object.keys(manifest.dependencies ?? {}).filter((d) => !ALLOWED_RUNTIME.test(d))).toEqual([]);
  });

  it('[US-011:AC4] should let packages/contracts add only the oRPC contract builder, which has no I/O (DEC-060)', () => {
    expect(dependenciesOf('contracts').filter((d) => !ALLOWED_RUNTIME.test(d))).toEqual(['@orpc/contract']);
  });
});
