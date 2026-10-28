import { readFileSync } from 'node:fs';
import {
  ACCOUNT_PERMISSIONS,
  PERMISSION_KEYS,
  PERMISSIONS,
  permissionScopeTypes,
  ROLE_KEYS,
  SYSTEM_ROLE_PERMISSIONS,
} from '@torre/contracts';
import type { RoleKey } from '@torre/contracts';
import { describe, expect, it } from 'vitest';

const authorization = readFileSync(new URL('../../../../docs/AUTHORIZATION.md', import.meta.url), 'utf8');
const KEY = /`([a-z_]+\.[a-z_]+)`/g;
const keysIn = (cell: string) => [...cell.matchAll(KEY)].map((m) => m[1] ?? '');

/** The rows of the markdown table that starts with `header`, split into trimmed cells. */
function tableRows(header: string): string[][] {
  const lines = authorization.split('\n');
  const start = lines.indexOf(header);
  if (start < 0) throw new Error(`table not found: ${header}`);
  const rows: string[][] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break;
    rows.push(
      line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
  }
  return rows;
}

// AUTHORIZATION.md §4: Acción | Recurso | Permisos | PA | OO | OA | TD | AR | CP | PL | Condición.
const MATRIX_COLUMNS: readonly RoleKey[] = [
  'platform_admin',
  'org_owner',
  'org_admin',
  'tournament_director',
  'arbiter',
  'captain',
  'player',
];
const matrix = tableRows('| Acción | Recurso | Permisos | PA | OO | OA | TD | AR | CP | PL | Condición |');

function seedFromTheMatrix() {
  const roles = Object.fromEntries(ROLE_KEYS.map((r) => [r, new Set<string>()])) as Record<RoleKey, Set<string>>;
  const account = new Set<string>();
  for (const cells of matrix) {
    const keys = keysIn(cells[2] ?? '');
    if ((cells[3] ?? '').startsWith('todos')) {
      // Rows for everyone: with a key, a permission of the own account; without one, a public action.
      keys.forEach((k) => account.add(k));
      continue;
    }
    MATRIX_COLUMNS.forEach((role, i) => {
      if ((cells[3 + i] ?? '').startsWith('✓')) keys.forEach((k) => roles[role].add(k));
    });
  }
  return { roles, account };
}

describe('the default matrix of the system roles (US-024)', () => {
  it('[US-024:AC1][INV-T-8][TC-150] should seed every system role with exactly the permissions of AUTHORIZATION.md §4', () => {
    const { roles } = seedFromTheMatrix();

    for (const role of ROLE_KEYS) {
      expect([...SYSTEM_ROLE_PERMISSIONS[role]].sort(), role).toEqual([...roles[role]].sort());
    }
  });

  it('[US-024:AC1][INV-T-8] should give every signed-in account the permissions the matrix gives to all of them', () => {
    expect([...ACCOUNT_PERMISSIONS].sort()).toEqual([...seedFromTheMatrix().account].sort());
  });

  it('[US-024:AC1][INV-T-8] should keep the catalogue, the matrix and the table of §4.1 with the same keys', () => {
    const inMatrix = new Set(matrix.flatMap((cells) => keysIn(cells[2] ?? '')));
    const inCatalogueTable = new Set(
      tableRows('| Grupo | Permisos (clave) | Reservado |').flatMap((cells) => keysIn(cells[1] ?? '')),
    );

    expect([...inMatrix].sort()).toEqual([...PERMISSION_KEYS].sort());
    expect([...inCatalogueTable].sort()).toEqual([...PERMISSION_KEYS].sort());
    for (const role of ROLE_KEYS)
      expect(new Set(SYSTEM_ROLE_PERMISSIONS[role]).size).toBe(SYSTEM_ROLE_PERMISSIONS[role].length);
  });

  it('[US-024:AC1][INV-T-6][TC-150] should keep reserved permissions on platform_admin only, in the platform scope', () => {
    const reserved = PERMISSION_KEYS.filter((k) => PERMISSIONS[k].reserved);

    expect(reserved.length).toBeGreaterThan(0);
    for (const role of ROLE_KEYS.filter((r) => r !== 'platform_admin')) {
      expect(
        SYSTEM_ROLE_PERMISSIONS[role].filter((k) => PERMISSIONS[k].reserved),
        role,
      ).toEqual([]);
    }
    for (const key of reserved) {
      expect(SYSTEM_ROLE_PERMISSIONS.platform_admin, key).toContain(key);
      expect(permissionScopeTypes(key), key).toEqual(['PLATFORM']);
    }
    // The own account's permissions go to no role, so no scope can grant them.
    for (const key of ACCOUNT_PERMISSIONS) expect(permissionScopeTypes(key), key).toEqual([]);
  });
});
