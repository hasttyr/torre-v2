#!/usr/bin/env node
// pnpm test:manifest — writes reports/run-manifest.json (TEST-PLAN.md §14.3): what ran, on what, with which seeds.
// Options: --suite <name>=<passed|failed|skipped> (repeatable). Suites without a flag are inferred from reports/.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fastCheckParams } from './lib/fast-check-params.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const git = (...args) => {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};

function composeImages() {
  const compose = existsSync(join(root, 'docker-compose.yml'))
    ? readFileSync(join(root, 'docker-compose.yml'), 'utf8')
    : '';
  const images = {};
  let service = null;
  for (const line of compose.split('\n')) {
    const svc = line.match(/^ {2}([a-z0-9-]+):\s*$/);
    if (svc) service = svc[1];
    const img = line.match(/^ {4}image:\s*(\S+)/);
    if (img && service) images[service] = img[1];
  }
  const docker = spawnSync('docker', ['version'], { stdio: 'ignore' }).status === 0;
  if (docker) {
    for (const [svc, image] of Object.entries(images)) {
      const r = spawnSync('docker', ['image', 'inspect', '--format', '{{index .RepoDigests 0}}', image], {
        encoding: 'utf8',
      });
      if (r.status === 0 && r.stdout.trim()) images[svc] = `${image}@${r.stdout.trim().split('@')[1]}`;
    }
  }
  return images;
}

function suites() {
  const out = {};
  const vitest = join(root, 'reports', 'vitest.json');
  if (existsSync(vitest)) out.unit = JSON.parse(readFileSync(vitest, 'utf8')).success ? 'passed' : 'failed';
  const playwright = join(root, 'reports', 'playwright.json');
  if (existsSync(playwright))
    out.e2e = (JSON.parse(readFileSync(playwright, 'utf8')).stats?.unexpected ?? 0) === 0 ? 'passed' : 'failed';
  process.argv.forEach((a, i) => {
    if (a === '--suite') {
      const [name, status] = process.argv[i + 1].split('=');
      out[name] = status;
    }
  });
  return out;
}

const pnpmVersion = (() => {
  const agent = process.env.npm_config_user_agent?.match(/pnpm\/(\S+)/)?.[1];
  if (agent) return agent;
  try {
    return execFileSync('pnpm', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim();
  } catch {
    return 'unknown';
  }
})();

const manifest = {
  runId: process.env.GITHUB_RUN_ID ? `gha-${process.env.GITHUB_RUN_ID}` : `local-${new Date().toISOString()}`,
  commit: git('rev-parse', 'HEAD'),
  tag: git('describe', '--tags', '--exact-match'),
  branch: process.env.GITHUB_HEAD_REF || git('rev-parse', '--abbrev-ref', 'HEAD'),
  startedAt: new Date().toISOString(),
  node: process.version,
  pnpm: pnpmVersion,
  os: process.env.RUNNER_OS
    ? `${process.env.RUNNER_OS} (${process.env.ImageOS ?? 'runner'})`
    : `${process.platform}-${process.arch}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  images: composeImages(),
  browsers: {},
  fastCheck: fastCheckParams(process.env),
  suites: suites(),
  artifacts: ['reports/vitest.json', 'reports/junit.xml', 'reports/traceability.md', 'coverage/'].filter((p) =>
    existsSync(join(root, p)),
  ),
};

mkdirSync(join(root, 'reports'), { recursive: true });
writeFileSync(join(root, 'reports', 'run-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`test:manifest: reports/run-manifest.json (${manifest.runId}, seed ${manifest.fastCheck.seed})`);
