import { describe, expect, it } from 'vitest';
import { assertSeedAllowed, DEMO_INSTITUTIONS } from './seed.js';

describe('development seed', () => {
  it('[US-007:AC4] should refuse to run in production', () => {
    expect(() => assertSeedAllowed('production')).toThrow('NODE_ENV=production');
    expect(() => assertSeedAllowed('development')).not.toThrow();
    expect(() => assertSeedAllowed('test')).not.toThrow();
  });

  it('[US-007:AC4] should mark every institution as demo data with a fixed UUID v7', () => {
    const ids = DEMO_INSTITUTIONS.map((i) => i.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const institution of DEMO_INSTITUTIONS) {
      expect(institution.name).toMatch(/\bDemo\b/);
      expect(institution.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
