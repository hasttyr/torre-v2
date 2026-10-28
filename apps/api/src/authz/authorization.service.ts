import { Inject, Injectable, Logger } from '@nestjs/common';
import { ACCOUNT_PERMISSIONS, PERMISSION_KEYS, SCOPE_TYPES } from '@torre/contracts';
import type { AuthzSubject, PermissionKey, ScopeType } from '@torre/contracts';
import { ClsService } from 'nestjs-cls';
import { apiError } from '../common/api-error.js';
import { SharedCache } from '../common/shared-cache.js';
import { DatabaseService } from '../database/database.service.js';
import { authzResource, defineAbilitiesFor } from './abilities.js';
import type { AppAbility, AppAction, Grant } from './abilities.js';

/** How long the permissions of an account stay cached: short, as AUTHORIZATION.md §1 asks (DEC-104). */
export const GRANTS_TTL_MS = 60_000;
const VERSION_KEY = 'authz:version';
const ABILITIES = 'authz:abilities';

const permissionKeys = new Set<string>(PERMISSION_KEYS);
const isPermissionKey = (key: string): key is PermissionKey => permissionKeys.has(key);
const scopeType = (value: string): ScopeType => {
  const found = SCOPE_TYPES.find((s) => s === value);
  if (found === undefined) throw new Error(`Unexpected scope in the database: ${value}`);
  return found;
};

/**
 * Who may do what (US-024:AC2–AC4, AUTHORIZATION.md §6). Callers name an action, a subject and the
 * attributes of the loaded resource; CASL stays behind this class, so the engine can change (AC3).
 *
 * The permissions of an account are read from its live memberships once per request and cached in
 * Redis under the account and a global version of roles. Whatever changes a role, its permissions or a
 * membership calls `invalidate()` after its commit: the next request reads them again (AC4). They never
 * travel in the JWT.
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger('Authorization');

  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(SharedCache) private readonly cache: SharedCache,
    @Inject(ClsService) private readonly cls: ClsService,
  ) {}

  /** Whether the account may do `action` on this resource (the fine check of the services). */
  async can(
    userId: string | null,
    action: AppAction,
    subject: AuthzSubject,
    attributes: Record<string, unknown>,
  ): Promise<boolean> {
    return (await this.abilityFor(userId)).can(action, authzResource(subject, attributes));
  }

  /** `can`, or 403 `FORBIDDEN`. */
  async assertCan(
    userId: string | null,
    action: AppAction,
    subject: AuthzSubject,
    attributes: Record<string, unknown>,
  ): Promise<void> {
    if (!(await this.can(userId, action, subject, attributes))) throw apiError('FORBIDDEN');
  }

  /**
   * The coarse check of `@RequirePermission()`: the account holds the permission in some scope (or as a
   * permission of its own account). The service still checks the loaded resource.
   */
  async holds(userId: string | null, permission: PermissionKey): Promise<boolean> {
    if (userId === null) return false;
    if (ACCOUNT_PERMISSIONS.includes(permission)) return true;
    return (await this.grantsOf(userId)).some((g) => g.permission === permission);
  }

  /** Makes every cached permission stale; call it after committing a change of roles or memberships. */
  async invalidate(): Promise<void> {
    try {
      await this.cache.increment(VERSION_KEY);
    } catch (error) {
      // The cache lives GRANTS_TTL_MS at most: a lost invalidation ends there.
      this.logger.warn({ err: error }, 'Permission cache could not be invalidated; it expires on its own');
    }
  }

  /** The abilities of the account, built once per request. */
  async abilityFor(userId: string | null): Promise<AppAbility> {
    const memo = this.cls.isActive() ? this.cls.get<Map<string, AppAbility> | undefined>(ABILITIES) : undefined;
    const key = userId ?? 'anonymous';
    const known = memo?.get(key);
    if (known) return known;
    const ability = defineAbilitiesFor(
      userId === null ? null : { id: userId },
      userId ? await this.grantsOf(userId) : [],
    );
    if (this.cls.isActive()) this.cls.set(ABILITIES, new Map(memo ?? []).set(key, ability));
    return ability;
  }

  private async grantsOf(userId: string): Promise<Grant[]> {
    let cacheKey: string | undefined;
    try {
      // The version first: a change committed after this read only bumps a newer version.
      const version = (await this.cache.get(VERSION_KEY)) ?? '0';
      cacheKey = `authz:grants:v1:${userId}:${version}`; // v1: the shape of `Grant`
      const cached = await this.cache.get(cacheKey);
      if (cached !== null) return JSON.parse(cached) as Grant[];
    } catch (error) {
      cacheKey = undefined;
      this.logger.warn({ err: error }, 'Permission cache unavailable; reading the database');
    }
    const grants = await this.load(userId);
    if (cacheKey !== undefined) {
      await this.cache.set(cacheKey, JSON.stringify(grants), GRANTS_TTL_MS).catch(() => undefined);
    }
    return grants;
  }

  /** Live memberships in live organizations, with the permissions of their live roles. */
  private async load(userId: string): Promise<Grant[]> {
    const memberships = await this.db.withTransaction(
      (tx) =>
        tx.membership.findMany({
          where: {
            userId,
            revokedAt: null,
            role: { deletedAt: null },
            OR: [{ organizationId: null }, { organization: { deletedAt: null } }],
          },
          select: {
            scopeType: true,
            scopeId: true,
            organizationId: true,
            role: { select: { permissions: { select: { permissionKey: true } } } },
          },
        }),
      { userId },
    );
    return memberships.flatMap((m) =>
      m.role.permissions
        .map((p) => p.permissionKey)
        .filter(isPermissionKey)
        .map((permission) => ({
          permission,
          scope: { type: scopeType(m.scopeType), id: m.scopeId, organizationId: m.organizationId },
        })),
    );
  }
}
