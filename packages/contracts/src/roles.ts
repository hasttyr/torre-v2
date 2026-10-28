/**
 * Scopes of a membership (AUTHORIZATION.md §2). A permission in a scope includes the scopes it
 * contains, never the other way round.
 */
export const SCOPE_TYPES = ['PLATFORM', 'ORGANIZATION', 'TOURNAMENT', 'TEAM'] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

/**
 * The seven system roles (AUTHORIZATION.md §3, GLOSSARY.md §5). `viewer` is not one of them: it is an
 * account without memberships (BR-ROLE-01). Organizations' own roles arrive with US-108.
 */
export const ROLE_KEYS = [
  'platform_admin',
  'org_owner',
  'org_admin',
  'tournament_director',
  'arbiter',
  'captain',
  'player',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/** The scope each system role is granted in (AUTHORIZATION.md §3); the `roles` table holds the same. */
export const ROLE_SCOPES = {
  platform_admin: 'PLATFORM',
  org_owner: 'ORGANIZATION',
  org_admin: 'ORGANIZATION',
  tournament_director: 'TOURNAMENT',
  arbiter: 'TOURNAMENT',
  captain: 'TEAM',
  player: 'TOURNAMENT',
} as const satisfies Record<RoleKey, ScopeType>;

/**
 * How a membership was obtained (ARCHITECTURE.md §8.1): the console command that makes the first
 * `platform_admin`, creating an organization, a direct role change (US-028) or an approved request
 * (US-029).
 */
export const MEMBERSHIP_SOURCES = ['BOOTSTRAP', 'CREATOR', 'DIRECT', 'REQUEST'] as const;
export type MembershipSource = (typeof MEMBERSHIP_SOURCES)[number];
