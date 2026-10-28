import {
  PERMISSION_KEYS,
  PERMISSIONS,
  permissionScopeTypes,
  ROLE_KEYS,
  SYSTEM_ROLE_PERMISSIONS,
} from '@torre/contracts';
import type { PermissionKey, RoleKey } from '@torre/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { syncPermissions } from '../src/authz/permissions-sync.js';
import { createPrismaClient } from '../src/database/prisma.js';
import type { PrismaClient } from '../src/database/prisma.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

let db: TestDatabase;
/** The migration role: the one that runs `permissions:sync` in every deploy. */
let migrator: PrismaClient;

beforeAll(async () => {
  db = await createTestDatabase();
  migrator = createPrismaClient(db.migrationUrl);
});

afterAll(async () => {
  await migrator.$disconnect();
  await db.dispose();
});

const roleId = async (key: RoleKey) =>
  (await db.prisma.role.findFirstOrThrow({ where: { key, organizationId: null } })).id;

async function storedMatrix(): Promise<Record<string, string[]>> {
  const rows = await db.prisma.rolePermission.findMany({
    where: { role: { isSystem: true } },
    select: { permissionKey: true, role: { select: { key: true } } },
  });
  const matrix: Record<string, string[]> = {};
  for (const row of rows) (matrix[row.role.key] ??= []).push(row.permissionKey);
  for (const list of Object.values(matrix)) list.sort();
  return matrix;
}

describe('permissions:sync (US-024)', () => {
  it('[US-024:AC1][INV-T-8][TC-150] should load the catalogue and seed the system roles with the matrix', async () => {
    const stored = await db.prisma.permission.findMany({ orderBy: { key: 'asc' } });

    expect(stored.map((p) => p.key)).toEqual([...PERMISSION_KEYS].sort());
    for (const p of stored) {
      const key = p.key as PermissionKey;
      expect(p, key).toMatchObject({
        group: PERMISSIONS[key].group,
        reserved: PERMISSIONS[key].reserved,
        scopeTypes: permissionScopeTypes(key),
      });
    }
    expect(await storedMatrix()).toEqual(
      Object.fromEntries(ROLE_KEYS.map((role) => [role, [...SYSTEM_ROLE_PERMISSIONS[role]].sort()])),
    );
  });

  it('[US-024:AC1] should change nothing when run again', async () => {
    expect(await syncPermissions(migrator)).toEqual({ added: [], updated: [], granted: 0 });
  });

  it('[US-024:AC1] should keep the edits of a system role and seed only permissions new to the catalogue', async () => {
    const arbiter = await roleId('arbiter');
    // A platform_admin took game.forfeit away from arbiters (US-108).
    await migrator.rolePermission.delete({
      where: { roleId_permissionKey: { roleId: arbiter, permissionKey: 'game.forfeit' } },
    });
    // claim.file is new to this database: neither the permission nor its grants exist.
    await migrator.rolePermission.deleteMany({ where: { permissionKey: 'claim.file' } });
    await migrator.permission.delete({ where: { key: 'claim.file' } });

    const report = await syncPermissions(migrator);

    const holders = ROLE_KEYS.filter((role) => SYSTEM_ROLE_PERMISSIONS[role].includes('claim.file'));
    expect(report).toEqual({ added: ['claim.file'], updated: [], granted: holders.length });
    const matrix = await storedMatrix();
    expect(matrix.arbiter).not.toContain('game.forfeit');
    for (const role of holders) expect(matrix[role], role).toContain('claim.file');
  });

  it('[US-024:AC1] should stop when the database has a permission the code no longer has', async () => {
    await migrator.permission.create({
      data: { key: 'ghost.haunt', group: 'tournament', description: 'Fantasma', reserved: false, scopeTypes: [] },
    });

    await expect(syncPermissions(migrator)).rejects.toThrow(/ghost\.haunt/);
    await migrator.permission.delete({ where: { key: 'ghost.haunt' } });
  });
});

describe('the permissions of a role in the database (US-024)', () => {
  it('[US-024:AC1][INV-T-6][TC-150] should refuse a reserved permission on any role but platform_admin', async () => {
    for (const role of ['org_owner', 'org_admin', 'tournament_director'] as const) {
      await expect(
        db.prisma.rolePermission.create({ data: { roleId: await roleId(role), permissionKey: 'trash.restore' } }),
        role,
      ).rejects.toThrow(/RESERVED_PERMISSION/);
    }
    await expect(
      db.prisma.rolePermission.update({
        where: { roleId_permissionKey: { roleId: await roleId('org_owner'), permissionKey: 'organization.update' } },
        data: { permissionKey: 'user.suspend' },
      }),
    ).rejects.toThrow(/RESERVED_PERMISSION/);
  });

  it('[US-024:AC1][INV-T-6] should refuse permissions outside the role’s scope and those of the own account', async () => {
    // Creating a tournament makes no sense inside a tournament; the own account's permissions go to no role.
    await expect(
      db.prisma.rolePermission.create({
        data: { roleId: await roleId('arbiter'), permissionKey: 'tournament.create' },
      }),
    ).rejects.toThrow(/cannot be granted/);
    await expect(
      db.prisma.rolePermission.create({
        data: { roleId: await roleId('org_owner'), permissionKey: 'role_request.create' },
      }),
    ).rejects.toThrow(/cannot be granted/);
    // Within its scope a permission can be added (what US-108 will do through the API).
    await expect(
      db.prisma.rolePermission.create({ data: { roleId: await roleId('arbiter'), permissionKey: 'claim.file' } }),
    ).resolves.toMatchObject({ permissionKey: 'claim.file' });
  });

  it('[US-024:AC1] should not let the application write the catalogue', async () => {
    await expect(
      db.prisma.permission.update({ where: { key: 'game.record' }, data: { reserved: true } }),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.prisma.permission.create({
        data: { key: 'game.cheat', group: 'results', description: 'Hacer trampa', reserved: false, scopeTypes: [] },
      }),
    ).rejects.toThrow(/permission denied/);
  });
});
