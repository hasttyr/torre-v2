import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { apiError } from '../common/api-error.js';

/** Who made the request, as the access token says (US-022:AC8). */
export interface Principal {
  readonly userId: string;
  readonly sessionId: string;
}

const PRINCIPAL = 'principal';

/**
 * The principal of the current request, kept in the request context (nestjs-cls, ARCHITECTURE.md §6.3)
 * because oRPC handlers only see headers. The JWT guard sets it; handlers read it.
 */
@Injectable()
export class AuthContext {
  constructor(private readonly cls: ClsService) {}

  set(principal: Principal): void {
    this.cls.set(PRINCIPAL, principal);
  }

  /** The principal, or 401 if the route was reached without one (a route wrongly marked public). */
  principal(): Principal {
    const principal = this.cls.get<Principal | undefined>(PRINCIPAL);
    if (!principal) throw apiError('UNAUTHENTICATED');
    return principal;
  }
}
