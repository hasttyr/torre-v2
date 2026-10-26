// Downloads a pinned release binary into .tools/<name>/<version>/, verifying its SHA-256 before the
// first run (ADR-0001). Used for tools that are not npm packages: gitleaks, Mailpit, RustFS.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function findFile(dir, fileName) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      const nested = findFile(full, fileName);
      if (nested) return nested;
    } else if (entry === fileName) return full;
  }
  return null;
}

/**
 * @param {object} spec
 * @param {string} spec.root      repository root
 * @param {string} spec.name      tool name (folder under .tools/)
 * @param {string} spec.version   pinned version
 * @param {string} spec.url       archive URL
 * @param {string} spec.sha256    expected SHA-256 of the archive (hex)
 * @param {string} spec.exe       executable file name inside the archive
 * @returns {Promise<string>} absolute path of the executable
 */
export async function ensureBinary({ root, name, version, url, sha256, exe }) {
  const dir = join(root, '.tools', name, version);
  const existing = existsSync(dir) ? findFile(dir, exe) : null;
  if (existing) return existing;

  console.log(`${name}: descargando ${url.split('/').pop()} …`);
  const archive = await download(url);
  const actual = createHash('sha256').update(archive).digest('hex');
  if (actual !== sha256) throw new Error(`${name}: checksum mismatch, expected ${sha256}, got ${actual}`);

  mkdirSync(dir, { recursive: true });
  const archivePath = join(dir, url.split('/').pop());
  writeFileSync(archivePath, archive);
  // Windows ships bsdtar, which also extracts .zip; Git Bash's GNU tar does not, so call it by path.
  const tar =
    process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(tar, ['-xf', archivePath, '-C', dir], { stdio: 'inherit' });
  rmSync(archivePath);
  const found = findFile(dir, exe);
  if (!found) throw new Error(`${name}: ${exe} not found after extracting the archive`);
  return found;
}

/** Reads the expected hash of `asset` from a `SHA256SUMS`-style file (`<hex>  <name>` per line). */
export async function sha256From(sumsUrl, asset) {
  const text = (await download(sumsUrl)).toString('utf8');
  const hit = text
    .split('\n')
    .map((l) => l.trim().split(/\s+/))
    .find(([, file]) => file === asset || file === `*${asset}`);
  if (!hit) throw new Error(`no checksum for ${asset} in ${sumsUrl}`);
  return hit[0];
}
