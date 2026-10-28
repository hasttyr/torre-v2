import {
  PERMISSION_KEYS,
  PERMISSIONS,
  permissionScopeTypes,
  ROLE_KEYS,
  SYSTEM_ROLE_PERMISSIONS,
} from '@torre/contracts';
import type { PermissionKey } from '@torre/contracts';
import type { PrismaClient } from '../database/prisma.js';
import { withTransaction } from '../database/transaction.js';

export interface SyncReport {
  /** Keys that entered the catalogue in this run. */
  readonly added: readonly PermissionKey[];
  /** Keys whose group, description, reserved flag or scopes changed. */
  readonly updated: readonly PermissionKey[];
  /** Role–permission rows of the system roles' default matrix written for the added keys. */
  readonly granted: number;
}

/**
 * `permissions:sync` (US-024:AC1, AUTHORIZATION.md §4.1): loads the catalogue of @torre/contracts into
 * `permissions` and gives each permission that enters the catalogue to the system roles of the matrix
 * (§4). A permission already there keeps the roles it has, so the edits of `platform_admin` (US-108)
 * survive every deploy (DEC-103). A key in the database that the code no longer has stops the sync:
 * removing a permission needs a migration that takes it away from the roles first.
 *
 * Runs with the migration role (the application role cannot write the catalogue), in one transaction.
 */
export async function syncPermissions(client: PrismaClient): Promise<SyncReport> {
  return withTransaction(client, async (tx) => {
    const stored = await tx.permission.findMany();
    const known = new Set<string>(PERMISSION_KEYS);
    const stale = stored.filter((p) => !known.has(p.key)).map((p) => p.key);
    if (stale.length > 0) {
      throw new Error(`permissions:sync: the database has permissions the code no longer has: ${stale.join(', ')}`);
    }
    const byKey = new Map(stored.map((p) => [p.key, p]));
    const added: PermissionKey[] = [];
    const updated: PermissionKey[] = [];
    for (const key of PERMISSION_KEYS) {
      const { group, description, reserved } = PERMISSIONS[key];
      const data = { group, description, reserved, scopeTypes: permissionScopeTypes(key) };
      const current = byKey.get(key);
      if (current === undefined) {
        await tx.permission.create({ data: { key, ...data } });
        added.push(key);
      } else if (
        current.group !== data.group ||
        current.description !== data.description ||
        current.reserved !== data.reserved ||
        current.scopeTypes.join() !== data.scopeTypes.join()
      ) {
        await tx.permission.update({ where: { key }, data });
        updated.push(key);
      }
    }
    const roles = await tx.role.findMany({
      where: { isSystem: true, deletedAt: null },
      select: { id: true, key: true },
    });
    const fresh = new Set<string>(added);
    let granted = 0;
    for (const role of ROLE_KEYS) {
      const id = roles.find((r) => r.key === role)?.id;
      if (id === undefined) throw new Error(`permissions:sync: system role ${role} is missing`);
      const rows = SYSTEM_ROLE_PERMISSIONS[role]
        .filter((key) => fresh.has(key))
        .map((permissionKey) => ({ roleId: id, permissionKey }));
      if (rows.length > 0) granted += (await tx.rolePermission.createMany({ data: rows })).count;
    }
    return { added, updated, granted };
  });
}
