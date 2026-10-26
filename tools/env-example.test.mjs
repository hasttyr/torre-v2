import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

/** Variable names listed in the first column of ARCHITECTURE.md §16.2. */
function documentedVariables() {
  const architecture = read('docs/ARCHITECTURE.md');
  const start = architecture.indexOf('### 16.2');
  const section = architecture.slice(start, architecture.indexOf('### 16.3', start));
  return section
    .split('\n')
    .filter((line) => line.startsWith('| `'))
    .flatMap((line) => [...line.split('|')[1].matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((m) => m[1]));
}

describe('.env.example (US-003:AC5)', () => {
  it('[US-003:AC5] should define every variable documented in ARCHITECTURE.md §16.2', () => {
    const example = read('.env.example');
    const defined = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]));
    const documented = documentedVariables();

    expect(documented.length).toBeGreaterThan(30);
    expect(documented.filter((name) => !defined.has(name))).toEqual([]);
  });

  it('[US-003:AC5] should point the database URLs at the roles created by the init script', () => {
    const example = read('.env.example');
    const init = read('infra/postgres/init/01-roles-and-extensions.sql');

    expect(example).toMatch(/^DATABASE_URL=postgresql:\/\/torre_app:torre_app_dev@/m);
    expect(example).toMatch(/^DATABASE_MIGRATION_URL=postgresql:\/\/torre_migrator:torre_migrator_dev@/m);
    expect(init).toContain("CREATE ROLE torre_app LOGIN PASSWORD 'torre_app_dev'");
    expect(init).toContain('NOBYPASSRLS');
  });
});
