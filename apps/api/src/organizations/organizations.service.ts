import { Inject, Injectable } from '@nestjs/common';
import { MEMBERSHIP_SOURCES, ROLE_KEYS, SCOPE_TYPES } from '@torre/contracts';
import type { ApiInputs, ApiOutputs, RoleKey } from '@torre/contracts';
import { AuditLog } from '../audit/audit-log.js';
import { apiError } from '../common/api-error.js';
import { DatabaseService } from '../database/database.service.js';

/** Whoever creates an organization owns it (AUTHORIZATION.md §4, "Crear organización"). */
const CREATOR_ROLE: RoleKey = 'org_owner';

const ORGANIZATION = { id: true, name: true, slug: true } as const;

/** A value the database already constrained to one of `values`; anything else is a bug, not input. */
function oneOf<T extends string>(values: readonly T[], value: string): T {
  const found = values.find((v) => v === value);
  if (found === undefined) throw new Error(`Unexpected value in the database: ${value}`);
  return found;
}

/** Organizations and memberships (US-023, AUTHORIZATION.md §2–§3). */
@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(AuditLog) private readonly audit: AuditLog,
  ) {}

  /**
   * Creates an organization with its creator as `org_owner`, in one transaction with its audit trail
   * (US-023:AC2). Only a `platform_admin` creates one directly; other accounts ask for one (US-029).
   */
  async create(
    actorId: string,
    input: ApiInputs['organizations']['create'],
  ): Promise<ApiOutputs['organizations']['create']> {
    try {
      return await this.db.withTransaction(
        async (tx) => {
          // TODO(US-024): `@RequirePermission('organization.create')` replaces this check. Until then a
          // live membership in the PLATFORM scope stands for it: only platform_admin is granted there
          // (AUTHORIZATION.md §3, DEC-100).
          const platform = await tx.membership.findFirst({
            where: { userId: actorId, scopeType: 'PLATFORM', revokedAt: null },
            select: { id: true },
          });
          if (!platform) throw apiError('FORBIDDEN');
          const owner = await tx.role.findFirstOrThrow({
            where: { key: CREATOR_ROLE, organizationId: null, deletedAt: null },
            select: { id: true },
          });
          const organization = await tx.organization.create({
            data: { name: input.name, slug: input.slug },
            select: ORGANIZATION,
          });
          const membership = await tx.membership.create({
            data: {
              organizationId: organization.id,
              userId: actorId,
              scopeType: 'ORGANIZATION',
              scopeId: organization.id,
              roleId: owner.id,
              source: 'CREATOR',
              grantedBy: actorId,
            },
            select: { id: true },
          });
          await this.audit.record(
            {
              action: 'organization.created',
              actorUserId: actorId,
              targetType: 'organization',
              targetId: organization.id,
              organizationId: organization.id,
              changes: { name: organization.name, slug: organization.slug },
            },
            tx,
          );
          await this.audit.record(
            {
              action: 'membership.granted',
              actorUserId: actorId,
              targetType: 'membership',
              targetId: membership.id,
              organizationId: organization.id,
              changes: {
                userId: actorId,
                role: CREATOR_ROLE,
                scopeType: 'ORGANIZATION',
                scopeId: organization.id,
                source: 'CREATOR',
              },
            },
            tx,
          );
          return organization;
        },
        { userId: actorId },
      );
    } catch (error) {
      // The only unique value written here is the slug: the new organization has no other membership.
      if ((error as { code?: unknown }).code === 'P2002') {
        throw apiError('VALIDATION_FAILED', {
          errors: [{ path: 'slug', code: 'taken', message: 'An organization already uses this slug' }],
        });
      }
      throw error;
    }
  }

  /** The live organizations where the account holds a live membership, in any scope (US-023:AC4). */
  async mine(userId: string): Promise<ApiOutputs['organizations']['list']> {
    return this.db.withTransaction(
      (tx) =>
        tx.organization.findMany({
          where: { deletedAt: null, memberships: { some: { userId, revokedAt: null } } },
          select: ORGANIZATION,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        }),
      { userId },
    );
  }

  /** The live memberships of the account, oldest first (US-023:AC4). */
  async memberships(userId: string): Promise<ApiOutputs['organizations']['memberships']> {
    const rows = await this.db.withTransaction(
      (tx) =>
        tx.membership.findMany({
          where: { userId, revokedAt: null },
          select: {
            id: true,
            scopeType: true,
            scopeId: true,
            organizationId: true,
            source: true,
            createdAt: true,
            role: { select: { key: true } },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
      { userId },
    );
    return rows.map((m) => ({
      id: m.id,
      role: oneOf(ROLE_KEYS, m.role.key),
      scopeType: oneOf(SCOPE_TYPES, m.scopeType),
      scopeId: m.scopeId,
      organizationId: m.organizationId,
      source: oneOf(MEMBERSHIP_SOURCES, m.source),
      grantedAt: m.createdAt.toISOString(),
    }));
  }
}
