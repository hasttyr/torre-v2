import { AbilityBuilder, createMongoAbility, subject } from '@casl/ability';
import type { ForcedSubject, MongoAbility, MongoQuery } from '@casl/ability';
import { ACCOUNT_PERMISSIONS, PERMISSIONS } from '@torre/contracts';
import type { AuthzSubject, PermissionKey, ScopeType } from '@torre/contracts';

/**
 * CASL actions: the permission keys themselves (`can('game.record', game)`), one per catalogue entry,
 * plus `read` for what anyone may see (DEC-103).
 */
export type AppAction = PermissionKey | 'read';

/**
 * A loaded resource, tagged with its subject (`subject('Game', game)` of @casl/ability). Checks run on
 * resources, never on the bare subject name: CASL answers yes for a name whenever a rule with
 * conditions exists.
 */
export type AuthzResource = { [S in AuthzSubject]: ForcedSubject<S> & Record<string, unknown> }[AuthzSubject];
export type AppAbility = MongoAbility<[AppAction, AuthzSubject | AuthzResource]>;

/** Tags a loaded resource with its subject, ready for `ability.can(action, resource)`. */
export const authzResource = <S extends AuthzSubject>(type: S, attributes: Record<string, unknown>) =>
  subject(type, attributes);

/** A permission of one of the account's memberships, in the scope of that membership (§6.1). */
export interface Grant {
  readonly permission: PermissionKey;
  readonly scope: { readonly type: ScopeType; readonly id: string | null };
}

/** The signed-in account, or null for an anonymous visitor (a viewer, BR-ROLE-01). */
export interface AuthUser {
  readonly id: string;
}

/**
 * The field a resource exposes for each scope (DEC-103): every authorized resource carries the
 * `organizationId` it belongs to and, inside a tournament or a team, `tournamentId` or `teamId` (a
 * tournament's own `tournamentId` is its id). A grant in a scope then covers what the scope contains:
 * an `org_admin` acts on every tournament of the organization (AUTHORIZATION.md §2).
 */
const SCOPE_FIELD = {
  ORGANIZATION: 'organizationId',
  TOURNAMENT: 'tournamentId',
  TEAM: 'teamId',
} as const satisfies Record<Exclude<ScopeType, 'PLATFORM'>, string>;

function scopeCondition(scope: Grant['scope']): MongoQuery<AuthzResource> | undefined {
  if (scope.type === 'PLATFORM') return undefined;
  // A non-platform grant without its scope id would match nothing; deny instead of guessing.
  if (scope.id === null) return { [SCOPE_FIELD[scope.type]]: { $in: [] } };
  return { [SCOPE_FIELD[scope.type]]: scope.id };
}

/**
 * The abilities of an account (AUTHORIZATION.md §6.1, US-024:AC1): public reads, the permissions every
 * account has over its own resources, and the permissions of its grants, each limited to the scope of
 * its membership. The rules of state (§5) arrive with US-024c.
 */
export function defineAbilitiesFor(user: AuthUser | null, grants: readonly Grant[]): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Public and unlisted tournaments, unless archived (AUTHORIZATION.md §4, BR-DEL-06).
  can('read', 'Tournament', { visibility: { $in: ['PUBLIC', 'UNLISTED'] }, archivedAt: null });

  if (user !== null) {
    for (const key of ACCOUNT_PERMISSIONS) {
      const { subject } = PERMISSIONS[key];
      const ownerField = 'ownerField' in PERMISSIONS[key] ? PERMISSIONS[key].ownerField : undefined;
      if (ownerField !== undefined) can(key, subject, { [ownerField]: user.id });
    }
  }

  for (const grant of grants) {
    const { subject } = PERMISSIONS[grant.permission];
    const condition = scopeCondition(grant.scope);
    if (condition === undefined) can(grant.permission, subject);
    else can(grant.permission, subject, condition);
  }
  return build();
}
