#!/usr/bin/env node
// pnpm dev (US-001:AC3, US-009): local infrastructure (Docker or native, `pnpm dev:infra`), then the API
// rebuilt and restarted on every change, and the web app with Vite. Ctrl+C stops the three processes.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
process.chdir(top);

const node = process.execPath;
// --check (or TORRE_DRY_RUN=1): only confirms that every piece exists, without starting anything.
if (process.argv.includes('--check') || process.env.TORRE_DRY_RUN === '1') {
  const pieces = [
    'tools/infra.mjs',
    'apps/api/tsconfig.build.json',
    'node_modules/typescript/bin/tsc',
    'apps/web/node_modules/vite/bin/vite.js',
  ];
  const missing = pieces.filter((piece) => !existsSync(piece));
  console.log(
    missing.length ? `dev: faltan ${missing.join(', ')}` : 'dev: infraestructura, API y web listas para levantar',
  );
  process.exit(missing.length ? 1 : 0);
}
const infra = spawnSync(node, ['tools/infra.mjs', 'up'], { stdio: 'inherit' });
if (infra.status !== 0) process.exit(infra.status ?? 2);

// A first full build, so `node --watch` has something to run while tsc keeps watching.
const build = spawnSync(node, ['node_modules/typescript/bin/tsc', '-p', 'apps/api/tsconfig.build.json'], {
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 2);

const children = [
  spawn(
    node,
    ['node_modules/typescript/bin/tsc', '-p', 'apps/api/tsconfig.build.json', '--watch', '--preserveWatchOutput'],
    {
      stdio: 'inherit',
    },
  ),
  spawn(node, ['--watch', '--watch-preserve-output', 'apps/api/dist/main.js'], { stdio: 'inherit' }),
  spawn(node, ['node_modules/vite/bin/vite.js'], { cwd: 'apps/web', stdio: 'inherit' }),
];
console.log('dev: API en http://localhost:3000/api/v1 · web en http://localhost:5173 (Ctrl+C para salir)');

const stop = () => {
  for (const child of children) child.kill();
  process.exit(0);
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
for (const child of children) child.once('exit', (code) => code !== 0 && code !== null && stop());
