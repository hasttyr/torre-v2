// @vitest-environment node
import { ROLE_KEYS, SCOPE_TYPES } from '@torre/contracts';
import { describe, expect, it } from 'vitest';
import { createAppI18n } from '../../app/i18n.js';
import { roleLabelKey, scopeLabelKey } from './roles.js';

describe('role and scope names (US-023)', () => {
  const i18n = createAppI18n().global;

  it('[US-023:AC3] should have a Spanish name for every role and scope of @torre/contracts', () => {
    const missing = [...ROLE_KEYS.map(roleLabelKey), ...SCOPE_TYPES.map(scopeLabelKey)].filter((key) => !i18n.te(key));

    expect(missing).toEqual([]);
  });

  it('[US-023:AC3] should name roles and scopes as the glossary does', () => {
    expect(i18n.t(roleLabelKey('tournament_director'))).toBe('Director del torneo');
    expect(i18n.t(roleLabelKey('arbiter'))).toBe('Árbitro');
    expect(i18n.t(scopeLabelKey('ORGANIZATION'))).toBe('Organización');
  });
});
