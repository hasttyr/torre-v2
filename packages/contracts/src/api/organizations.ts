import { oc } from '@orpc/contract';
import { z } from 'zod';
import { MEMBERSHIP_SOURCES, ROLE_KEYS, SCOPE_TYPES } from '../roles.js';

/**
 * The address of an organization in the web (`/orgs/:orgSlug`, SCREENS.md §1): lower-case letters,
 * digits and single hyphens, 3 to 63 characters. Unique among live organizations (DEC-099).
 */
export const ORGANIZATION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const organization = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
});

/**
 * `POST /organizations` (US-023:AC2): needs `organization.create`, a permission only `platform_admin`
 * holds; other accounts ask for an organization (US-029, DEC-056). Whoever creates it becomes its
 * `org_owner`. A slug already in use answers `VALIDATION_FAILED` on `slug`.
 */
export const create = oc
  .route({
    method: 'POST',
    path: '/organizations',
    successStatus: 201,
    operationId: 'createOrganization',
    tags: ['organizations'],
  })
  .input(
    z.strictObject({
      name: z.string().trim().min(1).max(120),
      slug: z.string().min(3).max(63).regex(ORGANIZATION_SLUG),
    }),
  )
  .output(organization);

/**
 * `GET /organizations` (US-023:AC4, US-024:AC9): the organizations the account may see, by name: those
 * where it holds a live membership, in any scope, or all of them for `platform_admin`. A new account has
 * none (BR-ROLE-01).
 */
export const list = oc
  .route({ method: 'GET', path: '/organizations', operationId: 'listMyOrganizations', tags: ['organizations'] })
  .output(z.array(organization));

/**
 * A live membership of the account: a role in a scope (AUTHORIZATION.md §2–§3). `scopeId` and
 * `organizationId` are null only in the `PLATFORM` scope. Times are ISO 8601 in UTC (CONVENTIONS.md §8).
 */
const membership = z.strictObject({
  id: z.uuid(),
  role: z.enum(ROLE_KEYS),
  scopeType: z.enum(SCOPE_TYPES),
  scopeId: z.uuid().nullable(),
  organizationId: z.uuid().nullable(),
  source: z.enum(MEMBERSHIP_SOURCES),
  grantedAt: z.iso.datetime(),
});

/**
 * `GET /me/memberships` (US-023:AC4): the live memberships of the account, oldest first. Revoked ones are
 * left out. Without memberships the account is a viewer (BR-ROLE-01).
 */
export const memberships = oc
  .route({ method: 'GET', path: '/me/memberships', operationId: 'listMyMemberships', tags: ['organizations'] })
  .output(z.array(membership));

/**
 * `GET /organizations/{id}` (US-024:AC2): one organization, for whoever holds `organization.view` in it
 * (its members, `platform_admin`). Another organization's id answers 403; an unknown one, 404.
 */
export const get = oc
  .route({ method: 'GET', path: '/organizations/{id}', operationId: 'getOrganization', tags: ['organizations'] })
  .input(z.strictObject({ id: z.uuid() }))
  .output(organization);

export const organizationsContract = { create, list, get, memberships };
