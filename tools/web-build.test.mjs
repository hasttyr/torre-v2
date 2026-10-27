import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const web = fileURLToPath(new URL('../apps/web', import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), 'torre-web-'));
afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe('web build (US-009)', () => {
  it('[US-009:AC6] should build the app with one chunk per lazily loaded view', () => {
    const build = spawnSync(
      process.execPath,
      ['node_modules/vite/bin/vite.js', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'],
      { cwd: web, encoding: 'utf8', env: { ...process.env, VITE_API_BASE_URL: 'http://localhost:3000/api/v1' } },
    );
    const assets = readdirSync(join(outDir, 'assets'));

    expect(build.status, build.stderr).toBe(0);
    expect(readFileSync(join(outDir, 'index.html'), 'utf8')).toMatch(/<html lang="es">/);
    for (const view of ['HomeView', 'NotFoundView', 'ForbiddenView', 'ServerErrorView']) {
      expect(
        assets.some((file) => file.startsWith(`${view}-`) && file.endsWith('.js')),
        view,
      ).toBe(true);
    }
  });

  const stylesheet = () => {
    const css = readdirSync(join(outDir, 'assets')).find((file) => file.endsWith('.css'));
    return readFileSync(join(outDir, 'assets', css), 'utf8');
  };

  it('[US-069:AC1][US-069:AC8] should compile the tokens, the glass utilities and their opaque fallback', () => {
    const styles = stylesheet();

    for (const utility of [
      '.bg-glass{',
      '.bg-glass-strong{',
      '.backdrop-blur-glass{',
      '.backdrop-blur-glass-strong{',
    ]) {
      expect(styles, utility).toContain(utility);
    }
    expect(styles).toContain('@media (prefers-reduced-transparency:reduce){:root{--glass-bg:var(--card)');
    expect(styles).toContain('[data-transparency=reduced],[data-theme=projector]{--glass-bg:var(--card)');
  });

  it('[US-069:AC4] should serve Fira Sans from the app itself, not from a third party', () => {
    const fonts = readdirSync(join(outDir, 'assets')).filter((file) => /^fira-sans-.*\.woff2$/.test(file));

    expect(fonts.length).toBeGreaterThan(0);
    expect(stylesheet()).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
  });
});
