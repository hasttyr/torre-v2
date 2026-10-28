import { AbilityBuilder, createMongoAbility, subject } from '@casl/ability';
import type { ForcedSubject, MongoAbility } from '@casl/ability';
import { ACCOUNT_PERMISSIONS, PERMISSION_KEYS, PERMISSIONS } from '@torre/contracts';
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

/**
 * A permission of one of the account's memberships, in the scope of that membership (§6.1), with the
 * organization the scope belongs to (null only in the PLATFORM scope).
 */
export interface Grant {
  readonly permission: PermissionKey;
  readonly scope: { readonly type: ScopeType; readonly id: string | null; readonly organizationId: string | null };
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

/**
 * Permissions whose condition is "a membership in the organization" in any scope (AUTHORIZATION.md §4,
 * "Ver organización: solo con membresía en ella"): an arbiter of one tournament sees its organization.
 * Every other permission acts within the grant's own scope, which fails closed on resources that do not
 * carry that scope's field; the stories of each resource add its conditions here (DEC-104).
 */
const ORGANIZATION_WIDE: ReadonlySet<PermissionKey> = new Set<PermissionKey>(['organization.view']);

/**
 * Where a grant applies: everywhere (PLATFORM), nowhere (a scoped grant that lost its ids denies instead
 * of widening) or on resources whose `field` holds `value`. Shared by the abilities and the listings.
 */
export type ScopeMatch = 'everywhere' | 'nowhere' | { readonly field: string; readonly value: string };

export function scopeMatch(grant: Grant): ScopeMatch {
  const { scope } = grant;
  if (scope.type === 'PLATFORM') return 'everywhere';
  if (ORGANIZATION_WIDE.has(grant.permission)) {
    return scope.organizationId === null ? 'nowhere' : { field: 'organizationId', value: scope.organizationId };
  }
  return scope.id === null ? 'nowhere' : { field: SCOPE_FIELD[scope.type], value: scope.id };
}

/** Results of a round: none in a CLOSED round; there only `game.correct_admin` corrects (DEC-051). */
const ROUND_RESULTS: readonly PermissionKey[] = ['game.record', 'game.correct', 'game.forfeit'];

/**
 * What changes a tournament: registration, teams, rounds and results, and its configuration. A CLOSED or
 * CANCELLED tournament is read-only until it is reopened (AUTHORIZATION.md §5); reports, the audit trail,
 * claims, reopening and archiving stay possible.
 */
export const TOURNAMENT_CHANGES: readonly PermissionKey[] = [
  ...PERMISSION_KEYS.filter((key) => ['registration', 'teams', 'rounds', 'results'].includes(PERMISSIONS[key].group)),
  'tournament.configure',
  'tournament.transition',
  'tournament.close',
];

/**
 * The abilities of an account (AUTHORIZATION.md §6.1, US-024:AC1): public reads, the permissions every
 * account has over its own resources, and the permissions of its grants, each limited to the scope of
 * its membership. Last, the rules of state of §5, which no set of permissions skips (INV-T-7, DEC-105):
 * resources expose `tournamentStatus`, `roundStatus` and `nextRoundPublished` when they have them.
 */
export function defineAbilitiesFor(user: AuthUser | null, grants: readonly Grant[]): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

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
    const match = scopeMatch(grant);
    if (match === 'everywhere') can(grant.permission, subject);
    else if (match !== 'nowhere') can(grant.permission, subject, { [match.field]: match.value });
  }

  for (const key of TOURNAMENT_CHANGES) {
    cannot(key, PERMISSIONS[key].subject, { tournamentStatus: { $in: ['CLOSED', 'CANCELLED'] } });
  }
  for (const key of ROUND_RESULTS) cannot(key, 'Game', { roundStatus: 'CLOSED' });
  // Once the next round is published a correction is administrative only (§5, DEC-051).
  cannot('game.correct', 'Game', { nextRoundPublished: true });
  return build();
}
