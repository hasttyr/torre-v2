import { Inject, Injectable, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

/** Keys of the request context (nestjs-cls, ARCHITECTURE.md §6.3). */
export const PRINCIPAL_KEY = 'principal';
const TENANT_KEY = 'tenant';

/**
 * The tenant of the current request (US-025:AC3): the organization the request acts in, once the
 * service knows it (from the route, never from the body). `withTransaction` reads it, with the account
 * of the access token, and sets both at the start of every transaction.
 */
@Injectable()
export class TenantContext {
  // Absent in the consoles (db:seed), which run outside requests.
  constructor(@Optional() @Inject(ClsService) private readonly cls?: ClsService) {}

  use(organizationId: string): void {
    this.cls?.set(TENANT_KEY, organizationId);
  }

  /** The tenant and the account of the request; empty outside a request (workers, consoles). */
  current(): { organizationId?: string; userId?: string } {
    if (!this.cls?.isActive()) return {};
    const organizationId = this.cls.get<string | undefined>(TENANT_KEY);
    const userId = this.cls.get<{ userId: string } | undefined>(PRINCIPAL_KEY)?.userId;
    return {
      ...(organizationId === undefined ? {} : { organizationId }),
      ...(userId === undefined ? {} : { userId }),
    };
  }
}
