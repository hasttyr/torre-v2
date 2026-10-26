#!/usr/bin/env node
// Runs gitleaks (ARCHITECTURE.md §14, CONSTRAINTS.md §2). It is a Go binary, not an npm package:
// this script uses the one on PATH or downloads the pinned release into .tools/, verifying its SHA-256
// against the release checksums before the first run (ADR-0001).
// Usage: node tools/gitleaks.mjs [--base <ref>] [--all]
//   default: scans the commits since the merge base plus staged and unstaged changes.
//   --all:   scans the whole history.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const VERSION = '8.30.1';
const ASSETS = {
  'win32-x64': `gitleaks_${VERSION}_windows_x64.zip`,
  'linux-x64': `gitleaks_${VERSION}_linux_x64.tar.gz`,
  'darwin-arm64': `gitleaks_${VERSION}_darwin_arm64.tar.gz`,
  'darwin-x64': `gitleaks_${VERSION}_darwin_x64.tar.gz`,
};
const RELEASE = `https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}`;

const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
process.chdir(top);

function onPath() {
  const r = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
  return r.status === 0 ? 'gitleaks' : null;
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function ensureBinary() {
  const fromPath = onPath();
  if (fromPath) return fromPath;
  const key = `${process.platform}-${process.arch}`;
  const asset = ASSETS[key];
  if (!asset) throw new Error(`no gitleaks release for ${key}; install gitleaks ${VERSION} on PATH`);
  const dir = join(top, '.tools', 'gitleaks', VERSION);
  const exe = join(dir, process.platform === 'win32' ? 'gitleaks.exe' : 'gitleaks');
  if (existsSync(exe)) return exe;

  console.log(`gitleaks: downloading ${asset} …`);
  const [archive, sums] = await Promise.all([
    download(`${RELEASE}/${asset}`),
    download(`${RELEASE}/gitleaks_${VERSION}_checksums.txt`),
  ]);
  const expected = sums
    .toString('utf8')
    .split('\n')
    .map((l) => l.trim().split(/\s+/))
    .find(([, name]) => name === asset)?.[0];
  const actual = createHash('sha256').update(archive).digest('hex');
  if (!expected || expected !== actual)
    throw new Error(`checksum mismatch for ${asset}: expected ${expected}, got ${actual}`);

  mkdirSync(dir, { recursive: true });
  const archivePath = join(dir, asset);
  writeFileSync(archivePath, archive);
  // Windows ships bsdtar, which also extracts .zip; Git Bash's GNU tar does not, so call it by path.
  const tar =
    process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(tar, ['-xf', archivePath, '-C', dir], { stdio: 'inherit' });
  rmSync(archivePath);
  if (!existsSync(exe)) throw new Error(`gitleaks binary not found after extracting ${asset}`);
  return exe;
}

function mergeBaseRange() {
  const i = process.argv.indexOf('--base');
  const candidates = [
    i > -1 ? process.argv[i + 1] : undefined,
    process.env.FLOOR_GUARD_BASE,
    'origin/main',
    'main',
  ].filter(Boolean);
  for (const ref of candidates) {
    const mb = spawnSync('git', ['merge-base', ref, 'HEAD'], { encoding: 'utf8' });
    if (mb.status === 0) {
      const sha = mb.stdout.trim();
      const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
      return sha === head ? null : `${sha}..HEAD`;
    }
  }
  return null;
}

try {
  const bin = await ensureBinary();
  const common = ['--redact', '--no-banner', '--exit-code', '1'];
  const runs = process.argv.includes('--all')
    ? [['git', ...common, '.']]
    : [
        ...(mergeBaseRange() ? [['git', ...common, `--log-opts=${mergeBaseRange()}`, '.']] : []),
        ['git', '--pre-commit', ...common, '.'],
        ['git', '--pre-commit', '--staged', ...common, '.'],
      ];
  for (const args of runs) {
    const r = spawnSync(bin, args, { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status === null ? 2 : 1);
  }
  // `git --pre-commit` only sees tracked files: copy the untracked ones to a scratch dir and scan it.
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  if (!process.argv.includes('--all') && untracked.length > 0) {
    const scratch = mkdtempSync(join(tmpdir(), 'gitleaks-untracked-'));
    try {
      for (const f of untracked) {
        mkdirSync(dirname(join(scratch, f)), { recursive: true });
        copyFileSync(f, join(scratch, f));
      }
      const r = spawnSync(bin, ['dir', ...common, scratch], { stdio: 'inherit' });
      if (r.status !== 0) process.exit(r.status === null ? 2 : 1);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
  console.log('gitleaks: no leaks found');
} catch (e) {
  console.error('gitleaks: ' + (e instanceof Error ? e.message : String(e)));
  process.exit(2);
}
