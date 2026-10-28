import { AbilityBuilder } from '@casl/ability';
import { accessibleBy, createPrismaAbility } from '@casl/prisma/runtime';
import type { PrismaQueryOf, Subjects } from '@casl/prisma/runtime';
import type { Ability } from '@casl/ability';
import { PERMISSIONS } from '@torre/contracts';
import type { PermissionKey } from '@torre/contracts';
import type { Organization, Prisma } from '../database/generated/client.js';
import { scopeMatch } from './abilities.js';
import type { Grant } from './abilities.js';

// @casl/prisma over the client that Prisma 7 generates into src/database (its README, "Custom
// PrismaClient output path"): the runtime entry point with this project's model types.
type ListingSubjects = Subjects<{ Organization: Organization }>;
type ListingAbility = Ability<[PermissionKey, ListingSubjects], PrismaQueryOf<Prisma.TypeMap>>;

/**
 * The models a listing filters with `accessibleBy` (US-024:AC9), and the column that holds each scope
 * attribute of the abilities (DEC-106): an organization's own `organizationId` is its `id`. A scope
 * attribute without a column here matches nothing, so a listing fails closed. Each listable resource
 * adds its row when its story arrives.
 */
const LISTABLE = {
  Organization: { organizationId: 'id' },
} as const satisfies Record<string, Record<string, string>>;

export type ListableSubject = keyof typeof LISTABLE;
export type ListingWhere = Prisma.OrganizationWhereInput;

/**
 * The Prisma filter of the rows the grants let the account see with `permission`, or `null` when they
 * let it see none (no query needed; @casl/prisma's empty marker would make Prisma fail).
 */
export function accessibleWhere(
  grants: readonly Grant[],
  permission: PermissionKey,
  subject: ListableSubject,
): ListingWhere | null {
  const { can, build } = new AbilityBuilder<ListingAbility>(createPrismaAbility);
  const columns: Readonly<Record<string, string>> = LISTABLE[subject];
  let any = false;
  for (const grant of grants) {
    if (grant.permission !== permission || PERMISSIONS[permission].subject !== subject) continue;
    const match = scopeMatch(grant);
    if (match === 'everywhere') {
      can(permission, subject);
      any = true;
    } else if (match !== 'nowhere' && columns[match.field] !== undefined) {
      can(permission, subject, { [columns[match.field] ?? match.field]: match.value });
      any = true;
    }
  }
  return any ? accessibleBy(build(), permission).ofType(subject) : null;
}
