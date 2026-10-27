// @vitest-environment node
// Reads the folder: file URLs exist only in the Node environment.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('shared/ui entry point (US-069b)', () => {
  it('[US-069:AC2] should expose every component of shared/ui from its index, the only entry point', () => {
    const dir = new URL('./', import.meta.url);
    const index = readFileSync(new URL('index.ts', dir), 'utf8');
    const components = ['', 'table/'].flatMap((sub) =>
      readdirSync(new URL(sub || '.', dir))
        .filter((f) => f.endsWith('.vue'))
        .map((f) => `./${sub}${f}`),
    );

    expect(components.length).toBeGreaterThan(10);
    expect(components.filter((file) => !index.includes(`'${file}'`))).toEqual([]);
  });
});
