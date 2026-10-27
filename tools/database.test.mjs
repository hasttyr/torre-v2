import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const MIGRATIONS = 'apps/api/prisma/migrations';

/** Files that could run a Prisma command: package scripts, CI workflows and tools. */
function commandSources() {
  const packageJsons = [
    'package.json',
    ...['apps', 'packages'].flatMap((dir) =>
      readdirSync(join(ROOT, dir), { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(join(ROOT, dir, e.name, 'package.json')))
        .map((e) => `${dir}/${e.name}/package.json`),
    ),
  ];
  const workflows = readdirSync(join(ROOT, '.github/workflows')).map((f) => `.github/workflows/${f}`);
  const tools = readdirSync(join(ROOT, 'tools'))
    .filter((f) => f.endsWith('.mjs') && f !== 'database.test.mjs')
    .map((f) => `tools/${f}`);
  return [...packageJsons, ...workflows, ...tools];
}

describe('database migrations (US-007)', () => {
  it('[US-007:AC1] should never run `prisma db push`: the schema changes only through migrations', () => {
    const offenders = commandSources().filter((file) => /\bdb\s+push\b/.test(read(file)));

    expect(commandSources().length).toBeGreaterThan(5);
    expect(offenders).toEqual([]);
  });

  it('[US-007:AC1] should version every migration as a non-empty SQL file for PostgreSQL', () => {
    const folders = readdirSync(join(ROOT, MIGRATIONS), { withFileTypes: true }).filter((e) => e.isDirectory());

    expect(folders.length).toBeGreaterThan(0);
    for (const folder of folders) {
      expect(folder.name).toMatch(/^\d{14}_[a-z0-9_]+$/);
      expect(read(`${MIGRATIONS}/${folder.name}/migration.sql`).trim()).not.toBe('');
    }
    expect(read(`${MIGRATIONS}/migration_lock.toml`)).toMatch(/provider = "postgresql"/);
  });

  it('[US-007:AC2] should migrate with DATABASE_MIGRATION_URL and connect the API with DATABASE_URL', () => {
    const cli = read('apps/api/prisma.config.ts');
    const service = read('apps/api/src/database/database.service.ts');

    expect(cli).toContain("process.env['DATABASE_MIGRATION_URL']");
    expect(cli).not.toMatch(/['"]DATABASE_URL['"]/);
    expect(service).toContain("config.get('DATABASE_URL')");
    expect(service).not.toContain('DATABASE_MIGRATION_URL');
  });
});
